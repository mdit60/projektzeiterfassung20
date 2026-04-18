# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.17  
**SW-Release:** V7.3.58  
**Datum:** 21. Januar 2026  
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben  
**Status:** V7 Entwicklung - Phase 3 erweitert (Zeiterfassung integriert)

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
| Berater-Portal | **Komplett** | **v7.3.58** |
| Firmen-Portal | **Komplett** | **v7.3.58** |
| Zeiterfassung | **Shared Component** | **v7.3.58** |
| Shared Components | **Vollstaendig** | **v7.3.58** |
| FZul-Migration | Ausstehend | Phase 4 |

### 1.3 MEILENSTEIN: Zeiterfassung als Shared Component

- TimesheetForm als wiederverwendbare Komponente
- Beide Portale nutzen identische Zeiterfassung
- Projekt-Vorauswahl ueber URL-Parameter
- Link aus Projekt-Detail-Seite

---

## 2. Aenderungshistorie v7.3.55 - v7.3.58

### 2.1 v7.3.57 - Portal-Unifikation

- ProjectList als Shared Component
- CompanyDataView als Shared Component
- EmployeeManagement als Shared Component (voller CRUD)
- ProjectCreateForm als Shared Component (PDF-Import + Manuell)
- Beide Portale nutzen identische Components

### 2.2 v7.3.58 - Zeiterfassung Integration (AKTUELL)

- **TimesheetForm** als Shared Component (1386 Zeilen)
- Excel-Navigation (Pfeiltasten, Tab, Enter)
- PDF-Export mit Speicherdialog
- Feiertags-Berechnung pro Bundesland
- Fehlzeiten (U=Urlaub, K=Krankheit, S=Sonstige)
- Dynamische AP-Zeilen (+ Button)
- **ProjectDetailPage** erweitert: Zeiterfassung-Tab mit Button
- URL-Parameter `?projekt=<id>` fuer Projekt-Vorauswahl
- Berater-Farbe korrigiert auf Sky-700 (#0369a1)

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
    - Header: Sky-700 (#0369a1)
    - Einstieg: /v7/berater/...

Firmen-Admin (client_admin)
    - Sieht NUR eigene Firma
    - Header: Cubintec-Gruen (#65A655)
    - Einstieg: /v7/firma/...

Projektleiter (project_leader)
    - Zugeordnete Projekte
    
Mitarbeiter (employee)
    - Nur eigene Zeiterfassung
```

### 3.3 Shared Components (komplett)

| Komponente | Version | Funktion |
|------------|---------|----------|
| **TimesheetForm** | **v7.3.58** | **Zeiterfassung (Stundennachweis)** |
| ProjectDetailPage | v7.3.58 | Projekt-Detail mit Zeiterfassung-Link |
| ProjectList | v7.3.57 | Projektliste |
| ProjectCreateForm | v7.3.57 | Projekt anlegen (PDF + Manuell) |
| CompanyDataView | v7.3.57 | Firmendaten anzeigen/bearbeiten |
| EmployeeManagement | v7.3.57 | Mitarbeiter CRUD |
| WorkPackageList | v7.3.54 | AP-Liste mit MA-Zuordnungen |
| WorkPackageEditModal | v7.3.52 | AP erstellen/bearbeiten |
| WorkPackageAssignmentModal | v7.3.52 | MA zu AP zuordnen |
| PortalHeader | v7.3.42 | Header mit portal-Farbe |
| Modal | v7.3.42 | Basis-Modal-Komponente |
| DataTable | v7.3.42 | Tabellen-Komponente |

### 3.4 TimesheetForm Props

```typescript
interface TimesheetFormProps {
  portal: 'berater' | 'firma';
  companyId: string;
  company: ClientCompany;
  employees: Employee[];
  projects: Project[];
  workPackages: WorkPackage[];
  currentUserId: string;
  currentUserDisplayName: string;
  isAdmin: boolean;
  onBack: () => void;
  initialEmployeeId?: string;
  initialProjectId?: string;
}
```

---

## 4. Farbschema

| Kontext | Farbe | Hex-Code | Tailwind |
|---------|-------|----------|----------|
| Berater eingeloggt | Sky-Blau | `#0369a1` | sky-700 |
| Firma eingeloggt | Cubintec-Gruen | `#65A655` | custom |

---

## 5. Deployment

### 5.1 Aktuelle Dateien

| Datei | Version | Pfad |
|-------|---------|------|
| TimesheetForm | **v7.3.58** | /components/shared/TimesheetForm.tsx |
| ProjectDetailPage | **v7.3.58** | /components/shared/ProjectDetailPage.tsx |
| Firma Zeiterfassung | **v7.3.58** | /v7/firma/zeiterfassung/page.tsx |
| Berater Zeiterfassung | **v7.3.58** | /v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx |

### 5.2 URL-Struktur Zeiterfassung

| Portal | URL |
|--------|-----|
| Firma | `/v7/firma/zeiterfassung?projekt=<id>` |
| Berater | `/v7/berater/foerderung/firma/<firmaId>/zeiterfassung?projekt=<projektId>` |

### 5.3 Git

| Branch | Verwendung |
|--------|------------|
| `main` | V6 Produktion |
| `v7-dev` | V7 Entwicklung |

---

## 6. Naechste Schritte (Phase 4+)

| ID | Aufgabe | Prioritaet | Status |
|----|---------|-----------|--------|
| 1 | FZul-Analyse (Forschungszulage) | Hoch | Phase 4 |
| 2 | Berichte-Funktionen | Mittel | Phase 5 |
| 3 | Produktion Deployment | Niedrig | Nach Tests |

---

## 7. Code-Metriken

| Metrik | Wert |
|--------|------|
| TimesheetForm | 1386 Zeilen |
| ProjectDetailPage | 1527 Zeilen |
| Firma-Wrapper | 265 Zeilen |
| Berater-Wrapper | 267 Zeilen |
| **Gesamt Shared Components** | **~8.500 Zeilen** |

---

*Letzte Aktualisierung: 21. Januar 2026, 19:00 Uhr*
