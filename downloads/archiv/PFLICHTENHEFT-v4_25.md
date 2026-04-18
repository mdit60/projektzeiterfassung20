# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.25  
**SW-Release:** V7.3.88  
**Datum:** 05. Februar 2026  
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben  
**Status:** V7 Entwicklung - Berichte-Modul implementiert

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

**Zusaetzlich fuer Berater:**
- Analyse der Zeiterfassungen gefoerderter Projekte
- Ermittlung verfuegbarer Projektstunden fuer die Beantragung der Forschungszulage (FZul nach §35a EStG)

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
┌─────────────────────────────────────────────────────────────────┐
│                    SaaS-PLATTFORM                               │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────┐          │
│  │ Beraterfirma A       │    │ Beraterfirma B       │          │
│  │ (z.B. MD Business)   │    │ (z.B. andere)        │          │
│  │                      │    │                      │          │
│  │  ┌────┐ ┌────┐      │    │  ┌────┐ ┌────┐      │          │
│  │  │Tippl│ │AS  │      │    │  │Kunde│ │Kunde│     │          │
│  │  │GmbH │ │Sys │ ...  │    │  │ X  │ │ Y  │ ...  │          │
│  │  └────┘ └────┘      │    │  └────┘ └────┘      │          │
│  └──────────────────────┘    └──────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
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

Beispiel: v7.3.88-2
```

| Teil | Bedeutung | Erhoehung bei |
|------|-----------|---------------|
| **Release** (7) | Major Release | Grosse Feature-Aenderungen (z.B. FZul-Integration) |
| **Version** (3) | Feature-Set | Neue Hauptfunktionen |
| **Build** (88) | Pflichtenheft-Stand | Dokumentation im Pflichtenheft |
| **Iteration** (-2) | Datei-Aenderung | Jede einzelne Dateimodifikation |

### 2.2 Regeln

1. **Iteration**: Zaehlt bei JEDER Dateimodifikation hoch (-1, -2, -3...)
2. **Build**: Erhoehung NUR bei Pflichtenheft-Update (z.B. 87 -> 88)
3. **Version**: Erhoehung bei neuem Feature-Set (z.B. 3 -> 4)
4. **Release**: Erhoehung bei Major Changes (z.B. 7 -> 8)

### 2.3 Dateinamen-Konvention

```
[Komponente]-v[Release]_[Version]_[Build]-[Iteration].tsx

Beispiele:
- berichte-page-v7_3_88-4.tsx
- zeiterfassung-page-v7_3_88-2.tsx
- berater-berichte-page-v7_3_88.tsx
```

---

## 3. Projektstatus Uebersicht

### 3.1 Release-Planung

| Release | Status | Inhalt |
|---------|--------|--------|
| **V7.3** | Aktiv | Berater-Portal + Firmen-Portal + Zeiterfassung + Berichte |
| **V7.4** | Geplant | FZul-Integration im Berater-Portal |

### 3.2 Build-Planung V7.3

| Build | Status | Inhalt |
|-------|--------|--------|
| v7.3.86 | Abgeschlossen | Fehlzeiten-Bug, Header-Navigation, Umlaute |
| v7.3.87 | Abgeschlossen | Team-Management, Excel-Arbeitsplan Import |
| v7.3.88 | **Abgeschlossen** | Berichte-Modul, Rollenbasierte Navigation |
| v7.3.89 | Naechster | Export-Funktionen (Excel, PDF) |

### 3.3 Aktueller Stand v7.3.88

| Komponente | Status | Version |
|------------|--------|---------|
| Berichte-Seite (Firma) | NEU | v7.3.88-4 |
| Berichte-Seite (Berater) | NEU | v7.3.88 |
| Zeiterfassung-Seite (Firma) | Aktualisiert | v7.3.88-2 |
| Firmen-Detail-Seite (Berater) | Aktualisiert | v7.3.88 |
| TimesheetForm | Aktualisiert | v7.3.88 |
| Team-Management | Funktioniert | v7.3.87 |
| Excel-Import | Funktioniert | v7.3.87-final |
| ZIM PDF Parser | Komplett | v4.9 |

---

## 4. Abgeschlossen: v7.3.88 (05. Februar 2026)

### 4.1 Berichte-Modul (Firmen-Portal)

**Route:** `/v7/firma/berichte`

**Kennzahlen-Leiste:**
| Kennzahl | Beschreibung |
|----------|--------------|
| Foerderprojekte | Anzahl aktiver Projekte |
| Mitarbeiter | MA mit Projektzuordnung |
| Geplante PM | Summe aus work_packages.total_person_months |
| Erfasste PM | Berechnet aus Stunden / 173.33 |

**Projekt-Uebersicht:**
- Alle aktiven Projekte mit Foerderprogramm-Badge
- Laufzeit (Start - Ende)
- Plan-PM vs. Ist-PM
- Fortschrittsbalken mit Ampel-Status:
  - Gruen: <= 90% (on-track)
  - Gelb: 90-110% (warning)
  - Rot: > 110% (critical)

**Zeiterfassungs-Status:**
- Monats-Dropdown (nur Projektzeitraum, nicht darueber hinaus)
- Pro MA: Soll-Arbeitstage vs. Erfasste Tage
- Status-Badges: Vollstaendig / X offen / Fehlt
- Beruecksichtigt Bundesland-Feiertage
- Button "Erfassen" -> Navigation zur Zeiterfassung mit Parametern

### 4.2 Berichte-Modul (Berater-Portal)

**Route:** `/v7/berater/foerderung/firma/[id]/berichte`

Gleiche Funktionalitaet wie Firmen-Portal, aber:
- Blauer Header (Berater-Portal)
- firmaId aus URL statt User-Profil
- Berater sieht Daten der ausgewaehlten Kundenfirma

### 4.3 Berater-Firmenansicht: Neue Tabs

**Route:** `/v7/berater/foerderung/firma/[id]`

Erweiterte Tab-Navigation:
| Tab | Beschreibung |
|-----|--------------|
| Firmendaten | Stammdaten der Firma |
| Projekte | Projektliste mit Anzahl-Badge |
| Mitarbeiter | MA-Verwaltung |
| Zeiterfassung | NEU: Link zur Zeiterfassung |
| Berichte | NEU: Link zu Berichte & Controlling |

### 4.4 Rollenbasierte Navigation (Firmen-Portal)

**Problem:** Normale MA sahen Admin-Navigation (Firmendaten, Projekte, etc.)

**Loesung:** Navigation dynamisch basierend auf portal_role:

| Rolle | Navigation |
|-------|-----------|
| client_admin | Firmendaten, Projekte, Mitarbeiter, Zeiterfassung, Berichte |
| project_leader | Header + Navigation + Zeiterfassung |
| employee | NUR Header (kein Navi-Menu) + Zeiterfassung |

**Sicherheit:**
- Normale MA sehen nur eigene ID in MA-Dropdown
- URL-Parameter `employee=xxx` wird fuer normale MA ignoriert
- Nur Admins koennen andere MA-IDs aus URL uebernehmen

### 4.5 URL-Parameter fuer Zeiterfassung

**Route:** `/v7/firma/zeiterfassung?employee=xxx&year=2023&month=2`

| Parameter | Beschreibung |
|-----------|--------------|
| employee | MA-ID (nur fuer Admins wirksam) |
| year | Jahr (z.B. 2023) |
| month | Monat 1-12 (z.B. 2 fuer Februar) |

Ermoeglicht direkten Sprung aus Berichte-Seite zum richtigen Monat.

### 4.6 Geaenderte Dateien v7.3.88

| Datei | Version | Aenderung |
|-------|---------|----------|
| berichte-page-v7_3_88-4.tsx | v7.3.88-4 | Firmen-Portal Berichte komplett |
| berater-berichte-page-v7_3_88.tsx | v7.3.88 | Berater-Portal Berichte komplett |
| zeiterfassung-page-v7_3_88-2.tsx | v7.3.88-2 | URL-Parameter + rollenbasierte Nav |
| TimesheetForm-v7_3_88.tsx | v7.3.88 | initialYear/initialMonth Props |
| v7-firma-detail-page-v7_3_88.tsx | v7.3.88 | Zeiterfassung + Berichte Tabs |

---

## 5. Frueherer Build: v7.3.87 (05. Februar 2026)

### 5.1 Team-Management

**Funktion:** Projektspezifisches Team verwalten

| Feature | Beschreibung |
|---------|--------------|
| MA hinzufuegen | MA aus Firmenstamm zum Projekt hinzufuegen |
| Lfd. Nr. | Projektspezifische MA-Nummer (1, 2, 3...) |
| Stundensatz | Projektspezifischer Override moeglich |
| Rolle | Rolle im Projekt (Projektleiter, Entwickler, etc.) |
| Zeitraum | Von/Bis Datum der Projekttaetigkeit |
| MA entfernen | Nur moeglich wenn KEINE Zeiterfassung vorhanden |

### 5.2 Excel-Arbeitsplan Import

**Datei-Format:** Standard Excel-Vorlage mit:
- Arbeitspaket-Spalten (AP1-APn)
- MA-Zeilen mit Stunden pro Monat
- Automatische PM-Berechnung

**Import-Ablauf:**
1. Excel hochladen -> Vorschau anzeigen
2. Mapping pruefen (MA, Arbeitspakete)
3. Konflikte anzeigen (fehlende MA, unbekannte APs)
4. Import bestaetigen -> Daten in DB

---

## 6. Offene Punkte

### 6.1 Phase v7.3.89 - Export-Funktionen

| Report | Format | Status |
|--------|--------|--------|
| Personalkosten | Excel | Geplant |
| Stundennachweis | PDF | Geplant |
| Projekt-Fortschritt | Grafik | Geplant |
| Zahlungsanforderung | Excel | Geplant |

### 6.2 Bekannte UI-Verbesserungen

| Stelle | Text | Korrektur |
|--------|------|-----------|
| Zeiterfassungs-Tab | "fuer DigiTrans" | "fuer DigiTrans" (Umlaute) |
| Diverse Seiten | "oeffnen" | "oeffnen" (Umlaute) |

---

## 7. Architektur

### 7.1 Shared Components Prinzip

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
| CompanyDataView | Beide Portale |
| ProjectList | Beide Portale |

### 7.2 Datenbank-Schema (Auszug)

```
v7_client_companies     - Kundenfirmen
v7_employees            - Mitarbeiter (client_company_id)
v7_projects             - Projekte (client_company_id)
v7_work_packages        - Arbeitspakete (project_id)
v7_project_assignments  - MA-Projekt-Zuordnung
v7_work_package_assignments - MA-AP-Zuordnung mit PM
v7_timesheets           - Zeiterfassung (work_date, hours, day_type)
v7_user_profiles        - User mit client_company_id + role
```

### 7.3 Berechtigungsmodell

| Rolle | Portal | Rechte |
|-------|--------|--------|
| system_admin | Berater | Alles |
| consultant | Berater | Alle Kundenfirmen |
| client_admin | Firma | Eigene Firma komplett |
| client_user + project_leader | Firma | Eigene Projekte + MA |
| client_user + employee | Firma | Nur eigene Zeiterfassung |

---

## 8. Deployment

### 8.1 Vercel

- Repository: GitHub
- Branch: main
- Auto-Deploy bei Push

### 8.2 Supabase

- Projekt: projektzeiterfassung
- Region: eu-central-1

---

**Dokument aktualisiert:** 05. Februar 2026  
**Naechster Build:** v7.3.89 (Export-Funktionen)
