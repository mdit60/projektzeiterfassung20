# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.16  
**SW-Release:** V7.3.55  
**Datum:** 21. Januar 2026  
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben  
**Status:** V7 Entwicklung - Phase 3 weitgehend abgeschlossen

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
| Berater-Portal | UTF-8 Fix + Shared WP | **v7.3.55** |
| Firmen-Portal | Funktional | v7.3.54 |
| Zeiterfassung | Fertig | v7.3.12 |
| Shared Components | AP-Komponenten fertig | v7.3.54 |
| FZul-Migration | Ausstehend | Phase 4 |

---

## 2. Aenderungshistorie v7.3.54 - v7.3.55

### 2.1 v7.3.54 - Firmen-Portal MA-Zuordnungen
- WorkPackageList mit MA-Zuordnungen inline
- Klare Tabellenstruktur mit sichtbaren Borders
- assignments, employees, showAssignments Props

### 2.2 v7.3.55 - Berater-Portal Fixes (AKTUELL)
- **UTF-8 korrigiert:** Umlaute als ue, oe, ae
- **Header angepasst:** Ozeanblau (#0369a1), Berater rechts, Abmelden
- **Bundesland entfernt** aus Header-Untertitel
- **Kaputte Emojis entfernt**
- **Login-URL korrigiert:** /login statt /v7/login
- **Shared Components integriert:** WorkPackageList, EditModal, AssignmentModal
- **Import-Konflikte behoben:** Typ-Aliase fuer lokale vs. importierte Typen

---

## 3. Architektur

### 3.1 Shared Components (fertig)

| Komponente | Version | Funktion |
|------------|---------|----------|
| WorkPackageList | v7.3.54 | AP-Liste mit MA-Zuordnungen |
| WorkPackageEditModal | v7.3.52 | AP erstellen/bearbeiten |
| WorkPackageAssignmentModal | v7.3.52 | MA zu AP zuordnen |
| PortalHeader | v7.3.42 | Header mit portal-Farbe |
| Modal | v7.3.42 | Basis-Modal |
| DataTable | v7.3.42 | Tabellen |

### 3.2 Noch zu erstellen (morgen)

| Komponente | Funktion |
|------------|----------|
| EmployeeTable | MA-Tabelle mit Wochenstunden + Stundensatz |
| TeamTable | Team-Zuordnung mit Rollen |
| ProjectOverview | Projekt-Stammdaten-Anzeige |

### 3.3 Farbschema

| Portal | Farbe | Hex-Code |
|--------|-------|----------|
| Berater | Ozeanblau | `#0369a1` |
| Firma | Cubintec-Gruen | `#65A655` |

---

## 4. Offene Punkte

### 4.1 Morgen (Prioritaet HOCH)

| Aufgabe | Beschreibung |
|---------|--------------|
| Strukturangleichung | Berater-Portal gleiche Tab-Struktur wie Firmen-Portal |
| EmployeeTable | Shared Component mit Wochenstunden + Stundensatz |
| Projekt-Detail | Eigene Seite statt aufklappbar |

### 4.2 Spaeter

| Aufgabe | Prioritaet |
|---------|-----------|
| FZul-Migration | Phase 4 |
| Berichte | Phase 5 |
| Produktion | Nach Tests |

---

## 5. Deployment

### 5.1 Git-Branches

| Branch | Verwendung |
|--------|------------|
| `main` | V6 Produktion |
| `v7-dev` | V7 Entwicklung |

### 5.2 Aktuelle Dateien

| Datei | Version | Pfad |
|-------|---------|------|
| Berater-Detailseite | v7.3.55 | /v7/berater/foerderung/firma/[id]/page.tsx |
| Firmen-Projekt-Detail | v7.3.54 | /v7/firma/projekte/[id]/page.tsx |
| WorkPackageList | v7.3.54 | /components/shared/WorkPackageList.tsx |

---

*Letzte Aktualisierung: 21. Januar 2026, 18:00 Uhr*
