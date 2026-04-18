# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.15  
**SW-Release:** V7.3.54  
**Datum:** 21. Januar 2026  
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben  
**Status:** V7 Entwicklung - Phase 3 (Shared Components)

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
| Berater-Portal | Funktional | v7.3.41-1 |
| Firmen-Portal | **Funktional** | **v7.3.54** |
| Zeiterfassung | Fertig | v7.3.12 |
| Shared Components | **Erweitert** | **v7.3.54** |
| FZul-Migration | Ausstehend | Phase 4 |

---

## 2. Aenderungshistorie

### 2.1 v7.3.52 - Shared Components Extraktion
- WorkPackageList.tsx - AP-Liste mit Sortierung
- WorkPackageEditModal.tsx - AP bearbeiten/erstellen
- WorkPackageAssignmentModal.tsx - MA zu AP zuordnen

### 2.2 v7.3.53 - Firmen-Portal Integration
- Projekt-Detail-Seite nutzt Shared Components
- Arbeitspakete-Tab mit allen Aktionen

### 2.3 v7.3.54 - MA-Zuordnungen Inline (AKTUELL)
- **WorkPackageList erweitert:**
  - MA-Zuordnungen direkt in der AP-Zeile anzeigen
  - Bunte Tags mit Namen und PM-Werten
  - "Verteilt: X / Y PM" Anzeige
  - Klare Tabellenstruktur (border-gray-300)
  - Gesamt-Zeile mit PM und Stunden
- **Neue Props:** assignments, employees, showAssignments
- **Datenbank:** Thomas Duehrkop portal_role + email gesetzt

---

## 3. Architektur-Entscheidung

### 3.1 Zentrale Erkenntnis

**Es gibt KEIN separates "Berater-Portal" und "Firmen-Portal"!**

Es gibt:
- Eine zentrale Codebasis mit Shared Components
- Rollen-basierte Berechtigungen aus der Datenbank
- Nur die Header-Farbe unterscheidet den Kontext

### 3.2 Rollen-Hierarchie

```
Berater (system_admin, consultant)
    - Sieht ALLE Firmen
    - Header: BLAU (#002451)
    - Einstieg: /v7/berater/...

Firmen-Admin (client_admin, portal_role='client_admin')
    - Sieht NUR eigene Firma
    - Header: GRUEN (#65A655)
    - Einstieg: /v7/firma/...

Projektleiter (portal_role='project_leader')
    - Sieht zugeordnete Projekte
    - Header: GRUEN
    
Mitarbeiter (portal_role='employee')
    - Sieht nur eigene Zeiterfassung
    - Header: GRUEN
```

### 3.3 Shared Components (aktuell)

| Komponente | Version | Funktion |
|------------|---------|----------|
| PortalHeader | v7.3.42 | Header mit portal-Farbe |
| WorkPackageList | **v7.3.54** | AP-Liste mit MA-Zuordnungen |
| WorkPackageEditModal | v7.3.52 | AP erstellen/bearbeiten |
| WorkPackageAssignmentModal | v7.3.52 | MA zu AP zuordnen |
| Modal | v7.3.42 | Basis-Modal-Komponente |
| DataTable | v7.3.42 | Tabellen-Komponente |

### 3.4 REGEL (im Memory)

> Alle UI als Shared Components in /components/shared/. 
> Beide Portale nutzen DIESELBEN Komponenten.
> portal-Parameter steuert Farbe. NIE Code duplizieren!

---

## 4. Farbschema

| Kontext | Farbe | Hex-Code | Bedeutung |
|---------|-------|----------|-----------|
| Berater eingeloggt | Dunkelblau | `#002451` | "Ich bin Berater" |
| Firma eingeloggt | Cubintec-Gruen | `#65A655` | "Ich bin Firmenmitarbeiter" |

**Regel:** Die Header-Farbe zeigt immer an, **wer eingeloggt ist** - nicht welche Daten man gerade sieht.

---

## 5. Datenbank-Rollen

### 5.1 v7_user_profiles.role (Login-Rolle)

| Wert | Bedeutung |
|------|-----------|
| system_admin | Cubintec Vollzugriff |
| consultant | Cubintec Berater |
| client_admin | Firmen-Vollzugriff |
| client_user | Firmen-Benutzer (Details via portal_role) |

### 5.2 v7_employees.portal_role (Firmen-Rolle)

| Wert | Bedeutung |
|------|-----------|
| client_admin | Administrator (wie Firmen-Admin) |
| project_leader | Kann Projektleiter sein |
| employee | Nur eigene Zeiterfassung |

### 5.3 Berechtigungspruefung im Code

```typescript
const getPortalRole = (): V7EmployeePortalRole => {
  // Erst User-Profile pruefen
  if (userProfile?.role === 'client_admin') return 'client_admin';
  // Dann Employee portal_role
  if (employee?.portal_role) return employee.portal_role;
  // Default
  return 'employee';
};

const isAdmin = portalRole === 'client_admin';
```

---

## 6. Stunden-Berechnung

### 6.1 Formel

```
Monatsstunden = Wochenstunden x 52 / 12
HOURS_PER_PM = 173.33 (fuer 40h/Woche)

Geplante Stunden = PM x HOURS_PER_PM
```

### 6.2 Anzeige in WorkPackageList

Jedes Arbeitspaket zeigt:
- PM-Wert (z.B. "2.00 PM")
- Stunden-Aequivalent (z.B. "= 347 h")
- MA-Zuordnungen mit individuellen PM

---

## 7. Naechste Schritte

### 7.1 Berater-Portal umstellen (Prioritaet HOCH)
- /v7/berater/foerderung/firma/[id]/page.tsx
- Auf shared WorkPackageList umstellen
- Identisches UI wie Firmen-Portal

### 7.2 Weitere Konsolidierung
- TeamTable als Shared Component
- ProjectOverview als Shared Component
- TimeEntryTable als Shared Component

### 7.3 Phase 4: FZul-Migration
- Datenübernahme aus V6
- FZul-spezifische Berichte

---

## 8. Deployment

### 8.1 Aktuelle Dateien

| Datei | Version | Pfad |
|-------|---------|------|
| WorkPackageList | **v7.3.54** | /components/shared/WorkPackageList.tsx |
| WorkPackageEditModal | v7.3.52 | /components/shared/WorkPackageEditModal.tsx |
| WorkPackageAssignmentModal | v7.3.52 | /components/shared/WorkPackageAssignmentModal.tsx |
| Projekt-Detail (Firma) | **v7.3.54** | /v7/firma/projekte/[id]/page.tsx |
| Firma-Detail (Berater) | v7.3.41-1 | /v7/berater/foerderung/firma/[id]/page.tsx |

### 8.2 Git

| Branch | Verwendung |
|--------|------------|
| `main` | V6 Produktion |
| `v7-dev` | V7 Entwicklung |

### 8.3 Vercel

Nach Push automatisches Deployment.

---

## 9. Offene Punkte

| ID | Aufgabe | Prioritaet | Status |
|----|---------|-----------|--------|
| 1 | Berater-Portal auf shared WorkPackageList | **HOCH** | Naechster Schritt |
| 2 | TeamTable als Shared Component | Mittel | Geplant |
| 3 | FZul-Migration (Phase 4) | Mittel | Ausstehend |
| 4 | Berichte-Funktionen | Mittel | Ausstehend |

---

*Letzte Aktualisierung: 21. Januar 2026, 17:00 Uhr*
