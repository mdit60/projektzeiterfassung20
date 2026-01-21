# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.14  
**SW-Release:** V7.3.51  
**Datum:** 21. Januar 2026  
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben  
**Status:** V7 Entwicklung - Phase 3 (Firmen-Portal Refactoring)

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
| Berater-Portal | Funktional | **v7.3.41-1** |
| Firmen-Portal | Anpassung | **v7.3.51** |
| Zeiterfassung | Fertig | v7.3.12 |
| Berater-Detailseite | Fertig | v7.3.41-1 |
| Shared Components | Vorhanden | v7.3.42 |
| FZul-Migration | Ausstehend | Phase 4 |

---

## 2. Aenderungshistorie v7.3.42 bis v7.3.51

### 2.1 v7.3.42 - Shared Components Basis
- PortalHeader.tsx - Gemeinsamer Header mit portal-Parameter
- Modal.tsx - Wiederverwendbare Modal-Komponente
- DataTable.tsx - Gemeinsame Tabellen-Komponente
- PortalNav.tsx - Navigation
- Constants: PORTAL_COLORS (blau/gruen)

### 2.2 v7.3.43 - Firmen-Portal Projekte
- Projekt-Detail-Seite mit Tabs (Uebersicht, APs, Team, Zeiterfassung)
- Team-Tab: Aggregierte PM aus work_package_assignments
- Basis-Funktionalitaet ohne Shared Components (FEHLER - siehe 2.7)

### 2.3 v7.3.44 - Projekt-Import
- PDF-Upload fuer ZIM-Antraege
- ZIM-Parser Integration
- Manuelle Projekt-Erstellung als Alternative

### 2.4 v7.3.45 - Dashboard
- Firmen-Dashboard mit Sub-Navigation
- Willkommen-Bereich mit Badges
- Aktive Projekte Tabelle

### 2.5 v7.3.47 - Mitarbeiter-Seite
- Konsistenter Header mit PortalHeader
- Sub-Navigation (Firmendaten | Projekte | Mitarbeiter)

### 2.6 v7.3.49 - Team-Tab Erweiterung
- Wochenstunden-Spalte (aus v7_employees.weekly_hours)
- Stundensatz-Spalte (aus v7_project_assignments.hourly_rate)
- Individuelle Stundenberechnung: PM x (Wochenstunden x 52 / 12)
- Bearbeiten-Modal fuer Stundensatz/Rolle

### 2.7 v7.3.50 - Projekt-Bearbeiten
- Bearbeiten-Button oben rechts funktioniert
- Modal fuer Projekt-Stammdaten (Name, FKZ, Laufzeit, etc.)
- Foerderprogramm-Dropdown (ZIM/BMBF Varianten)

### 2.8 v7.3.51 - Aufraeum-Version
- Redundante Quick Stats Kacheln entfernt
- Version vor Shared Components Refactoring

---

## 3. WICHTIG: Architektur-Entscheidung

### 3.1 Problem erkannt

In v7.3.43-v7.3.51 wurden Seiten OHNE Nutzung der Shared Components gebaut.
Das fuehrt zu:
- Code-Duplizierung
- Inkonsistenzen zwischen Portalen
- Doppelte Wartung

### 3.2 Loesung: Konsequente Shared Components

**REGEL (im Memory gespeichert):**
> Alle UI als Shared Components in /components/shared/. 
> Beide Portale nutzen DIESELBEN Komponenten.
> portal-Parameter steuert Farbe. NIE Code duplizieren!

### 3.3 Vorhandene Shared Components (v7.3.42)

| Komponente | Datei | Funktion |
|------------|-------|----------|
| PortalHeader | PortalHeader-v7_3_42.tsx | Header mit portal-Farbe |
| Modal | Modal-v7_3_42.tsx | Wiederverwendbare Modals |
| DataTable | DataTable-v7_3_42.tsx | Tabellen-Komponente |
| PortalNav | PortalNav-v7_3_42.tsx | Navigation |

### 3.4 Noch zu extrahieren aus v7.3.41-1

| Komponente | Quelle | Funktion |
|------------|--------|----------|
| WorkPackageList | v7-firma-detail-page-v7_3_41-1.tsx | AP-Liste mit Aktionen |
| WorkPackageAssignmentModal | v7-firma-detail-page-v7_3_41-1.tsx | MA zu AP zuordnen |
| WorkPackageEditModal | v7-firma-detail-page-v7_3_41-1.tsx | AP bearbeiten |
| ProjectOverview | v7-firma-detail-page-v7_3_41-1.tsx | Projektdaten-Anzeige |
| TeamTable | v7-firma-detail-page-v7_3_41-1.tsx | Team mit Stundensatz |

---

## 4. Naechste Schritte (Phase 3 Fortsetzung)

### 4.1 Shared Components Extraktion
1. WorkPackageAssignmentModal.tsx aus v7.3.41-1 extrahieren
2. WorkPackageList.tsx erstellen
3. Projekt-Detail-Seite auf Shared Components umstellen

### 4.2 Beide Portale vereinheitlichen
- Berater-Portal: /v7/berater/foerderung/firma/[id]/
- Firmen-Portal: /v7/firma/projekte/[id]/
- BEIDE nutzen dieselben Shared Components

---

## 5. Architektur & Rollen

### 5.1 Hierarchie

```
Beraterfirma (z.B. Cubintec GmbH)
    └── Berater (consultant) - z.B. M. Ditscherlein
        └── betreut Kundenfirmen

Kunden-Firma (z.B. AS System GmbH)
    ├── Firmen-Admin (client_admin) - z.B. Geschaeftsfuehrer
    ├── Projektleiter (project_leader)
    └── Mitarbeiter (employee)
```

### 5.2 Rollen und Berechtigungen

| Rolle | Portal | Rechte |
|-------|--------|--------|
| `system_admin` | Berater | Vollzugriff |
| `consultant` | Berater | Alle Kundenfirmen verwalten |
| `client_admin` | Firma | Eigene Firma verwalten, alle Mitarbeiter sehen |
| `project_leader` | Firma | Projekte verwalten, Team-Zeiten sehen |
| `employee` | Firma | Nur eigene Zeiterfassung |

### 5.3 Farbschema

| Portal | Farbe | Hex-Code | Verwendung |
|--------|-------|----------|------------|
| Berater-Portal | Dunkelblau | `#002451` | Header zeigt "Ich bin Berater" |
| Firmen-Portal | Cubintec-Gruen | `#65A655` | Header zeigt "Ich bin Firma" |

**Regel:** Die Header-Farbe zeigt immer an, **wer eingeloggt ist** - nicht welche Daten man gerade sieht.

---

## 6. Stunden-Berechnung

### 6.1 Formel

```
Monatsstunden = Wochenstunden x 52 / 12

Beispiele:
- 40h/Woche: 40 x 52 / 12 = 173.33 h/Monat
- 30h/Woche: 30 x 52 / 12 = 130.00 h/Monat
- 20h/Woche: 20 x 52 / 12 =  86.67 h/Monat

Geplante Stunden = PM x Monatsstunden
```

### 6.2 Datenquellen

| Feld | Tabelle | Spalte |
|------|---------|--------|
| Wochenstunden | v7_employees | weekly_hours |
| Stundensatz | v7_project_assignments | hourly_rate |
| Geplante PM | v7_work_package_assignments | planned_person_months |

**Wichtig:** Stundensatz ist PROJEKTSPEZIFISCH, nicht mitarbeiterspezifisch!
Der Stundensatz wird bei Antragstellung berechnet und bleibt fuer das Projekt fix.

---

## 7. Datenbank-Schema V7

### 7.1 Arbeitspakete (v7_work_packages)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | uuid | Primary Key |
| project_id | uuid | FK zu v7_projects |
| ap_number | int | Hauptnummer (1, 2, 3...) |
| ap_sub_number | int | Unternummer (0=Haupt, 1/2/3=Sub) |
| ap_code | text | Anzeige-Code ("AP1", "AP1.1") |
| name | text | Bezeichnung |
| total_person_months | decimal | Gesamt-PM |

### 7.2 Projekt-Zuordnungen (v7_project_assignments)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | uuid | Primary Key |
| project_id | uuid | FK zu v7_projects |
| employee_id | uuid | FK zu v7_employees |
| hourly_rate | decimal | Stundensatz lt. Antrag (EUR/h) |
| role_in_project | text | Rolle im Projekt |
| is_project_leader | boolean | Ist Projektleiter? |

### 7.3 AP-Zuordnungen (v7_work_package_assignments)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | uuid | Primary Key |
| work_package_id | uuid | FK zu v7_work_packages |
| employee_id | uuid | FK zu v7_employees |
| planned_person_months | decimal | Geplante PM |
| planned_hours | decimal | Geplante Stunden |
| hourly_rate | decimal | Stundensatz |

---

## 8. Deployment

### 8.1 Aktuelle Dateien Firmen-Portal

| Datei | Version | Pfad |
|-------|---------|------|
| Dashboard | v7.3.45 | /v7/firma/dashboard/page.tsx |
| Projekte-Liste | v7.3.43 | /v7/firma/projekte/page.tsx |
| Projekt-Detail | v7.3.51 | /v7/firma/projekte/[id]/page.tsx |
| Projekt-Neu | v7.3.44 | /v7/firma/projekte/neu/page.tsx |
| Mitarbeiter | v7.3.47 | /v7/firma/mitarbeiter/page.tsx |

### 8.2 Referenz: Berater-Portal (funktionierend)

| Datei | Version | Pfad |
|-------|---------|------|
| Berater-Detailseite | v7.3.41-1 | /v7/berater/foerderung/firma/[id]/page.tsx |
| Import-Seite | v7.3.39 | /v7/berater/foerderung/import/page.tsx |

### 8.3 Git-Branches

| Branch | Verwendung |
|--------|------------|
| `main` | V6 Produktion |
| `v7-dev` | V7 Entwicklung |

---

## 9. Offene Punkte

| ID | Aufgabe | Prioritaet | Status |
|----|---------|-----------|--------|
| 1 | Shared Components aus v7.3.41-1 extrahieren | **HOCH** | Naechster Schritt |
| 2 | Firmen-Portal auf Shared Components umstellen | **HOCH** | Geplant |
| 3 | AP-Bearbeitung + MA-Zuordnung im Firmen-Portal | **HOCH** | Fehlt |
| 4 | FZul-Migration (Phase 4) | Mittel | Ausstehend |
| 5 | Berichte-Funktionen | Mittel | Ausstehend |

---

*Letzte Aktualisierung: 21. Januar 2026, 02:20 Uhr*
