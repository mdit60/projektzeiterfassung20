# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.18  
**SW-Release:** V7.3.63  
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
| Berater-Portal | **Komplett** | **v7.3.63** |
| Firmen-Portal | **Komplett** | **v7.3.63** |
| Zeiterfassung | **Shared Component** | **v7.3.62** |
| Shared Components | **Vollstaendig** | **v7.3.63** |
| ZIM PDF-Import | **In Arbeit** | Parser laeuft, Extraktion offen |
| FZul-Migration | Ausstehend | Phase 4 |

---

## 2. Aenderungshistorie v7.3.62 - v7.3.63

### 2.1 v7.3.62 - Zeiterfassung-Tab Button

- **ProjectDetailPage**: Platzhalter durch echten Button ersetzt
- Button "Zur Zeiterfassung" navigiert mit vorausgewaehltem Projekt
- URL-Parameter `?projekt=<id>` wird korrekt uebergeben

### 2.2 v7.3.63 - PortalHeader TypeScript-Fix (AKTUELL)

- **PortalHeader**: userRole akzeptiert jetzt beide Typen
  - `V7EmployeePortalRole` ('client_admin', 'project_leader', 'employee')
  - `string` ('Berater', 'Admin', etc.)
- Behebt 7 TypeScript-Fehler in verschiedenen Komponenten
- getRoleLabel() behandelt alle Formate korrekt

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
| **PortalHeader** | **v7.3.63** | **Header mit flexiblem userRole-Typ** |
| TimesheetForm | v7.3.58 | Zeiterfassung (Stundennachweis) |
| ProjectDetailPage | v7.3.62 | Projekt-Detail mit Zeiterfassung-Button |
| ProjectList | v7.3.57 | Projektliste |
| ProjectCreateForm | v7.3.57 | Projekt anlegen (PDF + Manuell) |
| CompanyDataView | v7.3.57 | Firmendaten anzeigen/bearbeiten |
| EmployeeManagement | v7.3.60 | Mitarbeiter CRUD |
| WorkPackageList | v7.3.54 | AP-Liste mit MA-Zuordnungen |
| WorkPackageEditModal | v7.3.52 | AP erstellen/bearbeiten |
| WorkPackageAssignmentModal | v7.3.52 | MA zu AP zuordnen |
| Modal | v7.3.42 | Basis-Modal-Komponente |
| DataTable | v7.3.42 | Tabellen-Komponente |

---

## 4. Farbschema

| Kontext | Farbe | Hex-Code | Tailwind |
|---------|-------|----------|----------|
| Berater eingeloggt | Sky-Blau | `#0369a1` | sky-700 |
| Firma eingeloggt | Cubintec-Gruen | `#65A655` | custom |

---

## 5. Deployment

### 5.1 Vercel Environment Variables

| Variable | Wert | Zweck |
|----------|------|-------|
| `NEXT_PUBLIC_ZIM_PARSER_URL` | `/api/parse-zim` | ZIM PDF-Parser API |

### 5.2 Git

| Branch | Verwendung |
|--------|------------|
| `main` | V6 Produktion |
| `v7-dev` | V7 Entwicklung |

---

## 6. Offene Punkte

### 6.1 ZIM PDF-Import

| Status | Problem |
|--------|---------|
| Parser-Route | Funktioniert (/api/parse-zim) |
| XFA-Extraktion | Findet keine Daten im PDF |
| Naechster Schritt | Mit echtem ZIM-Antrag testen |

### 6.2 Naechste Phasen

| ID | Aufgabe | Prioritaet | Status |
|----|---------|-----------|--------|
| 1 | ZIM PDF-Parser debuggen | Hoch | In Arbeit |
| 2 | FZul-Analyse (Forschungszulage) | Hoch | Phase 4 |
| 3 | Berichte-Funktionen | Mittel | Phase 5 |
| 4 | Produktion Deployment | Niedrig | Nach Tests |

---

## 7. Code-Metriken

| Metrik | Wert |
|--------|------|
| TimesheetForm | 1386 Zeilen |
| ProjectDetailPage | 1510 Zeilen |
| EmployeeManagement | 1233 Zeilen |
| PortalHeader | 107 Zeilen |
| **Gesamt Shared Components** | **~9.000 Zeilen** |

---

*Letzte Aktualisierung: 21. Januar 2026, 21:45 Uhr*
