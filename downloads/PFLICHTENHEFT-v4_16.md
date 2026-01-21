# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.16  
**SW-Release:** V7.3.55  
**Datum:** 21. Januar 2026  
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben  
**Status:** V7 Entwicklung - Phase 3 abgeschlossen

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
| Berater-Portal | **Refactored** | **v7.3.55** |
| Firmen-Portal | Funktional | v7.3.54 |
| Zeiterfassung | Fertig | v7.3.12 |
| Shared Components | **Vollstaendig** | **v7.3.55** |
| FZul-Migration | Ausstehend | Phase 4 |

### 1.3 MEILENSTEIN: Phase 3 abgeschlossen

Beide Portale nutzen jetzt die gleichen Shared Components fuer:
- Arbeitspakete-Anzeige (WorkPackageList)
- AP-Bearbeitung (WorkPackageEditModal)
- MA-Zuordnung (WorkPackageAssignmentModal)

---

## 2. Aenderungshistorie v7.3.54 - v7.3.55

### 2.1 v7.3.54 - Firmen-Portal MA-Zuordnungen
- WorkPackageList erweitert mit MA-Zuordnungen inline
- Klare Tabellenstruktur mit sichtbaren Borders
- assignments, employees, showAssignments Props

### 2.2 v7.3.55 - Berater-Portal Shared Components (AKTUELL)
- **Berater-Seite komplett auf Shared Components umgestellt**
- WorkPackageList, WorkPackageEditModal, WorkPackageAssignmentModal
- Handler-Funktionen angepasst fuer neue Signaturen
- ~380 Zeilen Code reduziert (2924 -> 2542)
- Einheitliches Design fuer beide Portale

---

## 3. Architektur (Final)

### 3.1 Zentrale Erkenntnis

**Eine zentrale Codebasis mit rollen-basiertem Zugriff:**
- Shared Components in `/components/shared/`
- `portal`-Parameter steuert nur die Farbe (blau/gruen)
- Berechtigungen kommen aus der Datenbank

### 3.2 Rollen-Hierarchie

```
Berater (system_admin, consultant)
    - Sieht ALLE Firmen
    - Header: BLAU (#002451)
    - Einstieg: /v7/berater/...

Firmen-Admin (client_admin)
    - Sieht NUR eigene Firma
    - Header: GRUEN (#65A655)
    - Einstieg: /v7/firma/...

Projektleiter (project_leader)
    - Zugeordnete Projekte
    
Mitarbeiter (employee)
    - Nur eigene Zeiterfassung
```

### 3.3 Shared Components (komplett)

| Komponente | Version | Funktion |
|------------|---------|----------|
| WorkPackageList | v7.3.54 | AP-Liste mit MA-Zuordnungen, Collapsible |
| WorkPackageEditModal | v7.3.52 | AP erstellen/bearbeiten |
| WorkPackageAssignmentModal | v7.3.52 | MA zu AP zuordnen |
| PortalHeader | v7.3.42 | Header mit portal-Farbe |
| Modal | v7.3.42 | Basis-Modal-Komponente |
| DataTable | v7.3.42 | Tabellen-Komponente |

### 3.4 Komponenten-Verwendung

```
WorkPackageList Props:
- portal: 'berater' | 'firma'
- workPackages: WorkPackage[]
- assignments: WorkPackageAssignment[]
- employees: Employee[]
- showAssignments: boolean
- isCollapsible: boolean
- onAddWorkPackage, onEditWorkPackage, onDeleteWorkPackage, onAssignEmployees
```

---

## 4. Farbschema

| Kontext | Farbe | Hex-Code |
|---------|-------|----------|
| Berater eingeloggt | Dunkelblau | `#002451` |
| Firma eingeloggt | Cubintec-Gruen | `#65A655` |

---

## 5. Deployment

### 5.1 Aktuelle Dateien

| Datei | Version | Pfad |
|-------|---------|------|
| Berater-Detailseite | **v7.3.55** | /v7/berater/foerderung/firma/[id]/page.tsx |
| Projekt-Detail (Firma) | v7.3.54 | /v7/firma/projekte/[id]/page.tsx |
| WorkPackageList | v7.3.54 | /components/shared/WorkPackageList.tsx |
| WorkPackageEditModal | v7.3.52 | /components/shared/WorkPackageEditModal.tsx |
| WorkPackageAssignmentModal | v7.3.52 | /components/shared/WorkPackageAssignmentModal.tsx |

### 5.2 Git

| Branch | Verwendung |
|--------|------------|
| `main` | V6 Produktion |
| `v7-dev` | V7 Entwicklung |

---

## 6. Naechste Schritte (Phase 4+)

| ID | Aufgabe | Prioritaet | Status |
|----|---------|-----------|--------|
| 1 | TeamTable als Shared Component | Mittel | Optional |
| 2 | FZul-Migration vorbereiten | Mittel | Phase 4 |
| 3 | Berichte-Funktionen | Mittel | Phase 5 |
| 4 | Produktion Deployment | Niedrig | Nach Tests |

---

## 7. Code-Metriken

| Metrik | Vor Refactoring | Nach Refactoring |
|--------|-----------------|------------------|
| Berater-Seite (Zeilen) | 2924 | 2542 |
| Firmen-Seite (Zeilen) | ~1400 | ~1400 |
| Shared Code | 0 | ~1200 |
| **Code-Reduktion** | - | **~380 Zeilen** |

---

*Letzte Aktualisierung: 21. Januar 2026, 17:30 Uhr*
