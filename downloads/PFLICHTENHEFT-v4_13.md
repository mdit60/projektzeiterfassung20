# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.13  
**SW-Release:** V7.3.41-1  
**Datum:** 20. Januar 2026  
**Projekt:** Projektzeiterfassung für FuE-Fördervorhaben  
**Status:** V7 Entwicklung - Phase 3 (Firmen-Portal)

---

## 1. Projektstatus Übersicht

### 1.1 Versionen

| Version | Status | Beschreibung |
|---------|--------|--------------|
| **V6** | ✓ Produktion | Stabile Version auf main-Branch (FZul-Analyse) |
| **V7** | 🔧 Entwicklung | Berater-Portal + Firmen-Portal auf v7-dev |

### 1.2 Aktueller Stand V7

| Komponente | Status | Version |
|------------|--------|---------|
| Berater-Portal | ✓ Funktional | **v7.3.41-1** |
| Firmen-Portal | 🔧 Anpassung geplant | v7.3.5 |
| **Zeiterfassung** | ✓ **Fertig** | **v7.3.12** |
| **Berater-Detailseite** | ✓ **Fertig** | **v7.3.41-1** |
| FZul-Migration | ⏳ Ausstehend | Phase 4 |

---

## 2. Änderungshistorie v7.3.39 bis v7.3.41-1

### 2.1 v7.3.39 - Hierarchische AP-Nummern
- Datenbank-Migration: `ap_sub_number` Spalte hinzugefügt
- AP-Codes unterstützen hierarchische Nummern (AP1.1, AP1.2)
- Unique Constraint auf `ap_code` statt `ap_number`
- Import-Seite: Hierarchische APs aus ZIM-PDF

### 2.2 v7.3.40 - UTF-8 Bereinigung
- Alle UTF-8 Encoding-Fehler behoben
- Emojis korrekt dargestellt (📊📁👥👤📋🗑️)
- Mitarbeiter-Icons permanent sichtbar

### 2.3 v7.3.41 - Tabellen-Layout
- Arbeitspakete-Liste als Tabelle (Header: AP | Bezeichnung | PM | +Hinzufügen)
- AP-Code korrekt angezeigt (AP1.1, AP1.2 statt nur AP1)
- Sortierung nach `ap_number` + `ap_sub_number`
- Icons permanent sichtbar

### 2.4 v7.3.41-1 - Einheitliches Design
- Mitarbeiter-Tabelle im gleichen Stil wie Arbeitspakete
- Einheitliches UI: Border, Header-Zeile, Trennlinien
- Konsistentes Look-and-Feel

---

## 3. Nächste Schritte

### 3.1 Gemeinsame Komponenten (Phase 3 - Fortführung)

**Problem:** Berater-Portal und Firmen-Portal haben aktuell separate Code-Dateien für identische Funktionen. Das führt zu:
- Doppelte Wartung
- Inkonsistenzen zwischen den Portalen
- Fehleranfällige Synchronisation

**Lösung:** Gemeinsame Komponenten erstellen, die nur durch einen Parameter unterschieden werden:

```
/components/shared/
  ├── ProjectList.tsx        ← Gemeinsame Komponente
  ├── WorkPackageTable.tsx   ← Gemeinsame Komponente
  ├── EmployeeTable.tsx      ← Gemeinsame Komponente
  └── ...

Parameter: portal: 'berater' | 'firma'
  → Berater = Blauer Header (#0369a1)
  → Firma = Grüner Header (#65A655)
```

**Nächste Aufgabe:** Firmen-Portal (`/v7/firma/projekte`) auf die gleiche Abfrage-Mechanik umstellen wie Berater-Portal.

---

## 4. Architektur & Rollen

### 4.1 Hierarchie

```
Beraterfirma (z.B. Cubintec GmbH)
    └── Berater (consultant) - z.B. M. Ditscherlein
        └── betreut Kundenfirmen

Kunden-Firma (z.B. AS System GmbH)
    ├── Firmen-Admin (client_admin) - z.B. Geschäftsführer
    ├── Projektleiter (project_leader)
    └── Mitarbeiter (employee)
```

### 4.2 Rollen und Berechtigungen

| Rolle | Portal | Rechte |
|-------|--------|--------|
| `system_admin` | Berater | Vollzugriff |
| `consultant` | Berater | Alle Kundenfirmen verwalten |
| `client_admin` | Firma | Eigene Firma verwalten, alle Mitarbeiter sehen |
| `project_leader` | Firma | Projekte verwalten, Team-Zeiten sehen |
| `employee` | Firma | Nur eigene Zeiterfassung |

### 4.3 Farbschema

| Portal | Farbe | Hex-Code | Verwendung |
|--------|-------|----------|------------|
| Berater-Portal | Ozeanblau | `#0369a1` | Header zeigt "Ich bin Berater" |
| Firmen-Portal | Cubintec-Grün | `#65A655` | Header zeigt "Ich bin Firma" |

**Regel:** Die Header-Farbe zeigt immer an, **wer eingeloggt ist** - nicht welche Daten man gerade sieht.

---

## 5. UI-Design-Richtlinien (NEU v7.3.41-1)

### 5.1 Tabellen-Design

Alle Listen (Arbeitspakete, Mitarbeiter, Projekte) verwenden einheitliches Design:

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER 1    │ HEADER 2          │ HEADER 3  │ AKTIONEN   │ +Button │  ← Grau, uppercase
├─────────────┼───────────────────┼───────────┼────────────┼─────────┤
│ Wert        │ Beschreibung      │ Zahl      │ 👤 ✏️ 🗑️  │         │  ← Hover: bg-gray-50
├─────────────┼───────────────────┼───────────┼────────────┼─────────┤
│ Wert        │ Beschreibung      │ Zahl      │ 👤 ✏️ 🗑️  │         │
└─────────────┴───────────────────┴───────────┴────────────┴─────────┘
```

### 5.2 Aktions-Icons

| Icon | Farbe | Hover | Bedeutung |
|------|-------|-------|-----------|
| 👤 (Zuordnen) | Purple | bg-purple-100 | Mitarbeiter zuordnen |
| ✏️ (Bearbeiten) | Gray | bg-gray-200 | Bearbeiten |
| 🗑️ (Löschen) | Red | bg-red-100 | Löschen |

**Regel:** Icons sind **immer sichtbar**, nicht nur bei Hover.

---

## 6. Datenbank-Schema V7

### 6.1 Arbeitspakete (v7_work_packages)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | uuid | Primary Key |
| project_id | uuid | FK zu v7_projects |
| ap_number | int | Hauptnummer (1, 2, 3...) |
| **ap_sub_number** | int | **Unternummer (0=Haupt, 1/2/3=Sub)** |
| ap_code | text | Anzeige-Code ("AP1", "AP1.1", "AP1.2") |
| name | text | Bezeichnung |
| total_person_months | decimal | Gesamt-PM |

**Sortierung:** `ORDER BY ap_number, ap_sub_number`

---

## 7. Deployment

### 7.1 Aktuelle Dateien

| Datei | Version | Pfad |
|-------|---------|------|
| Berater-Detailseite | v7.3.41-1 | `/v7/berater/foerderung/firma/[id]/page.tsx` |
| Import-Seite | v7.3.39 | `/v7/berater/foerderung/import/page.tsx` |
| Firmen-Projektseite | v7.3.39 | `/v7/firma/projekte/page.tsx` |

### 7.2 Git-Branches

| Branch | Verwendung |
|--------|------------|
| `main` | V6 Produktion |
| `v7-dev` | V7 Entwicklung |

---

## 8. Offene Punkte

| ID | Aufgabe | Priorität | Status |
|----|---------|-----------|--------|
| 1 | Firmen-Portal auf gemeinsame Komponenten umstellen | Hoch | ⏳ Geplant |
| 2 | Gemeinsame Abfrage-Mechanik implementieren | Hoch | ⏳ Geplant |
| 3 | FZul-Migration (Phase 4) | Mittel | ⏳ Ausstehend |
| 4 | Berichte-Funktionen | Mittel | ⏳ Ausstehend |

---

*Letzte Aktualisierung: 20. Januar 2026, 23:30 Uhr*
