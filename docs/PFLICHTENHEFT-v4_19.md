# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.19  
**SW-Release:** V7.3.73  
**Datum:** 23. Januar 2026  
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben  
**Status:** V7 Entwicklung - Phase 3 Zeiterfassung komplett

---

## 1. Projektstatus Uebersicht

### 1.1 Versionen

| Version | Status | Beschreibung |
|---------|--------|--------------|
| **V6** | Produktion | Stabile Version auf main-Branch (FZul-Analyse) |
| **V7** | Entwicklung | Berater-Portal + Firmen-Portal auf v7-dev |

### 1.2 Aktueller Stand V7

| Komponente | Status | Version |
|------------|--------|---------|
| Berater-Portal | **Komplett** | v7.3.73 |
| Firmen-Portal | **Komplett** | v7.3.73 |
| Zeiterfassung | **Komplett** | v7.3.73 |
| Shared Components | **Vollstaendig** | v7.3.73 |
| FZul-Migration | Ausstehend | Phase 4 |

---

## 2. Architektur

### 2.1 Zentrale Erkenntnis

**Eine zentrale Codebasis mit rollen-basiertem Zugriff:**
- Shared Components in `/components/shared/`
- `portal`-Parameter steuert nur die Farbe (blau/gruen)
- Berechtigungen kommen aus der Datenbank

### 2.2 Shared Components vs. Pages - Visualisierung

```
+---------------------------------------------------------------------+
|                      SHARED COMPONENTS                              |
|            (die eigentliche Logik + UI, 90% des Codes)              |
+---------------------------------------------------------------------+
|  TimesheetForm.tsx          |  ProjectCreateForm.tsx                |
|  - Excel-Navigation         |  - PDF-Import                         |
|  - PDF-Export               |  - Manuelles Formular                 |
|  - Feiertage                |  - Validierung                        |
|  - Fehlzeiten (U/K/S)       |  - Speichern                          |
|  - Speichern                |                                       |
|  (~1500 Zeilen)             |  (849 Zeilen)                         |
+---------------------------------------------------------------------+
                      ^                       ^
                      |                       |
          +-----------+-----------+-----------+-----------+
          |                       |                       |
+---------+---------+   +---------+---------+   +---------+---------+
|   FIRMA PAGE      |   |   BERATER PAGE    |   |    usw...         |
|   (~300 Zeilen)   |   |   (~250 Zeilen)   |   |                   |
+-------------------+   +-------------------+   +-------------------+
| - Auth pruefen    |   | - Auth pruefen    |   |                   |
| - EIGENE          |   | - ALLE Firmen     |   |                   |
|   Firma laden     |   |   zugaenglich     |   |                   |
| - Rollen-         |   | - Firma-ID        |   |                   |
|   basiert         |   |   aus URL         |   |                   |
| - Gruener         |   | - Blauer          |   |                   |
|   Spinner         |   |   Spinner         |   |                   |
+-------------------+   +-------------------+   +-------------------+
```

### 2.3 Warum zwei Pages fuer eine Funktion?

Die **Pages** sind "Wrapper" - sie bereiten nur die Daten vor:

| Aufgabe | Firma-Page | Berater-Page |
|---------|------------|--------------|
| **Auth-Check** | Ist Firmen-User? | Ist Berater/Admin? |
| **Firma ermitteln** | Aus `user_profile.client_company_id` | Aus URL `[id]` Parameter |
| **Welche MA sichtbar?** | Rollenbasiert (Admin/PL/MA) | Alle MA der Firma |
| **Welche Projekte?** | Rollenbasiert | Alle Projekte |
| **Zurueck-Button** | -> `/v7/firma` | -> `/v7/berater/foerderung/firma/[id]` |
| **Spinner-Farbe** | Gruen | Blau |

Dann rufen beide **dasselbe** Shared Component auf:
```tsx
<TimesheetForm portal="firma|berater" ... />
```

### 2.4 Vorteile dieser Architektur

1. **Keine Code-Duplizierung** - Logik existiert nur einmal
2. **Konsistente UI** - Beide Portale sehen gleich aus (nur Farbe anders)
3. **Einfache Wartung** - Bug-Fix an einer Stelle behebt es ueberall
4. **Klare Trennung** - Pages = Routing/Auth, Components = Logik/UI

### 2.5 Rollen-Hierarchie

```
System-Admin (system_admin)
    |
    +-- Berater (consultant)
            |
            +-- Firmen-Admin (client_admin)
                    |
                    +-- Projektleiter (project_leader)
                            |
                            +-- Mitarbeiter (employee)
```

---

## 3. Zeiterfassung (TimesheetForm)

### 3.1 Funktionen

| Funktion | Status | Beschreibung |
|----------|--------|--------------|
| Stundenerfassung | ✅ | Tagesgenau pro Arbeitspaket |
| Fehlzeiten (U/K/S) | ✅ | Urlaub, Krankheit, Sonderurlaub |
| Feiertage | ✅ | Bundeslandspezifisch, nur Werktage |
| Excel-Navigation | ✅ | Tab, Enter, Pfeiltasten |
| PDF-Export | ✅ | Stundennachweis als PDF |
| Speichern | ✅ | Mit Fehlerbehandlung |
| Laden | ✅ | Automatisch bei Monatswechsel |

### 3.2 Fehlzeiten-Eingabe

| Code | Bedeutung | Eingabe | Anzeige |
|------|-----------|---------|---------|
| U | Urlaub | u oder U | Blau in AP-Zeile, 8h bei "Urlaub" |
| K | Krankheit | k oder K | Blau in AP-Zeile, 8h bei "Krankheit" |
| S | Sonderurlaub | s oder S | Blau in AP-Zeile, 8h bei "Sonstige" |

### 3.3 Feiertags-Logik

- Feiertage werden bundeslandspezifisch berechnet
- Nur Feiertage auf **Werktagen** zaehlen als Ausfallzeit (8h)
- Feiertage auf Wochenenden werden **nicht** gezaehlt

### 3.4 Datenbank-Constraint

Die Tabelle `v7_timesheets` hat einen CHECK-Constraint:

```sql
CHECK (
  (work_package_id IS NOT NULL AND absence_code IS NULL)  -- Normale Stunden
  OR 
  (work_package_id IS NULL AND absence_code IS NOT NULL)  -- Fehlzeiten
  OR 
  (work_package_id IS NULL AND absence_code IS NULL AND is_billable = false)  -- Nicht zuschussfaehig
)
```

**Konsequenz:** Fehlzeiten werden OHNE `work_package_id` gespeichert.

---

## 4. Login-System

### 4.1 V6 Legacy User Linking

Mitarbeiter die in V6 existieren (in `auth.users`) aber nicht in `v7_user_profiles`:
- RPC-Funktion `get_auth_user_id_by_email` ermittelt die auth.user ID
- Automatische Erstellung des `v7_user_profiles` Eintrags
- Verknuepfung mit bestehendem `v7_employees` Eintrag

### 4.2 Neuen Login erstellen

1. E-Mail eingeben
2. Passwort generieren oder eingeben
3. User wird in `auth.users` und `v7_user_profiles` erstellt
4. Verknuepfung mit Mitarbeiter ueber `user_id`

---

## 5. Datenmodell

### 5.1 Zentrale Tabellen

| Tabelle | Funktion |
|---------|----------|
| `v7_client_companies` | Kundenfirmen |
| `v7_projects` | Foerderprojekte |
| `v7_work_packages` | Arbeitspakete |
| `v7_employees` | Mitarbeiter |
| `v7_work_package_assignments` | MA <-> AP Zuordnung |
| `v7_timesheets` | Zeiterfassungsdaten |
| `v7_user_profiles` | Login-Profile |

### 5.2 Wichtige Unterscheidungen

| Feld | Tabelle | Werte | Bedeutung |
|------|---------|-------|-----------|
| `role` | v7_user_profiles | system_admin, consultant, client_admin, client_user | Login-Berechtigung |
| `portal_role` | v7_employees | client_admin, project_leader, employee | Firmen-Portal Rechte |

---

## 6. Deployment

### 6.1 Aktuelle Dateien

| Datei | Version | Pfad |
|-------|---------|------|
| TimesheetForm | v7.3.73 | /components/shared/TimesheetForm.tsx |
| ProjectDetailPage | v7.3.62 | /components/shared/ProjectDetailPage.tsx |
| ProjectCreateForm | v7.3.57 | /components/shared/ProjectCreateForm.tsx |
| EmployeeManagement | v7.3.66 | /components/shared/EmployeeManagement.tsx |
| Firma Zeiterfassung | v7.3.67 | /app/v7/firma/zeiterfassung/page.tsx |
| Berater Zeiterfassung | v7.3.59 | /app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx |
| Firma Dashboard | v7.3.61 | /app/v7/firma/dashboard/page.tsx |
| ZIM Parser | v7.3.69 | /app/api/parse-zim/route.ts |

### 6.2 URL-Struktur

| Funktion | Firma-Portal | Berater-Portal |
|----------|--------------|----------------|
| Dashboard | `/v7/firma` | `/v7/berater/foerderung` |
| Projekte | `/v7/firma/projekte` | `/v7/berater/foerderung/firma/[id]?tab=projekte` |
| Projekt-Detail | `/v7/firma/projekte/[id]` | `/v7/berater/foerderung/firma/[id]/projekt/[pid]` |
| Zeiterfassung | `/v7/firma/zeiterfassung?projekt=<id>` | `/v7/berater/foerderung/firma/[id]/zeiterfassung?projekt=<pid>` |
| Mitarbeiter | `/v7/firma/mitarbeiter` | `/v7/berater/foerderung/firma/[id]?tab=mitarbeiter` |

### 6.3 Git

| Branch | Verwendung |
|--------|------------|
| `main` | V6 Produktion |
| `v7-dev` | V7 Entwicklung |

---

## 7. Naechste Schritte (Phase 4+)

| ID | Aufgabe | Prioritaet | Status |
|----|---------|-----------|--------|
| 1 | FZul-Analyse (Forschungszulage) | Hoch | Phase 4 |
| 2 | Berichte-Funktionen | Mittel | Phase 5 |
| 3 | Produktion Deployment | Niedrig | Nach Tests |
| 4 | ZIM PDF Import testen | Mittel | Offen |

---

## 8. Aenderungshistorie

### v4.19 (23.01.2026)
- Zeiterfassung v7.3.73: Fehlzeiten (U/K/S) vollstaendig implementiert
- DB-Constraint fuer Fehlzeiten dokumentiert
- Feiertags-Logik: Nur Werktage zaehlen
- Speichern/Laden mit korrekter Fehlerbehandlung
- ZIM Parser: Kurzname-Extraktion verbessert
- V6 Legacy User Linking implementiert

### v4.18 (22.01.2026)
- Architektur-Visualisierung (Shared Components vs. Pages) hinzugefuegt
- Erklaerung warum zwei Pages fuer eine Funktion benoetigt werden
- Projektdateien aufgeraeumt (von ~88 auf ~35 Dateien reduziert)

### v4.17 (21.01.2026)
- TimesheetForm als Shared Component
- ProjectDetailPage mit Zeiterfassung-Tab
- Dashboard rollenbasierte Ansicht

### v4.16 (21.01.2026)
- EmployeeManagement Shared Component
- Login-Verknuepfung fuer bestehende User

---

*Letzte Aktualisierung: 23. Januar 2026, 12:30 Uhr*
