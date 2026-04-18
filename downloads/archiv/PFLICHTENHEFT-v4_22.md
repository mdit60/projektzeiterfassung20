# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.22  
**SW-Release:** V7.3.86  
**Datum:** 25. Januar 2026  
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben  
**Status:** V7 Entwicklung - TypeScript-Korrekturen abgeschlossen

---

## 1. Versionierungsprinzip

### 1.1 Schema

```
V[Release].[Version].[Build]-[Iteration]

Beispiel: v7.3.86-2
```

| Teil | Bedeutung | Erhoehung bei |
|------|-----------|---------------|
| **Release** (7) | Major Release | Grosse Feature-Aenderungen (z.B. FZul-Integration) |
| **Version** (3) | Feature-Set | Neue Hauptfunktionen |
| **Build** (86) | Pflichtenheft-Stand | Dokumentation im Pflichtenheft |
| **Iteration** (-2) | Datei-Aenderung | Jede einzelne Dateimodifikation |

### 1.2 Regeln

1. **Iteration**: Zaehlt bei JEDER Dateimodifikation hoch (-1, -2, -3...)
2. **Build**: Erhoehung NUR bei Pflichtenheft-Update (z.B. 86 → 87)
3. **Version**: Erhoehung bei neuem Feature-Set (z.B. 3 → 4)
4. **Release**: Erhoehung bei Major Changes (z.B. 7 → 8)

### 1.3 Dateinamen-Konvention

```
[Komponente]-v[Release]_[Version]_[Build]-[Iteration].tsx

Beispiele:
- TimesheetForm-v7_3_86-1.tsx
- ProjectDetailPage-v7_3_86-2.tsx
- PortalHeader-v7_3_87-1.tsx (neuer Build)
```

---

## 2. Projektstatus Uebersicht

### 2.1 Release-Planung

| Release | Status | Inhalt |
|---------|--------|--------|
| **V7.3** | Aktiv | Berater-Portal + Firmen-Portal + Zeiterfassung |
| **V7.4** | Geplant | FZul-Integration im Berater-Portal |

### 2.2 Build-Planung V7.3

| Build | Status | Inhalt |
|-------|--------|--------|
| v7.3.86 | **Abgeschlossen** | TypeScript-Korrekturen |
| v7.3.87 | Naechster | Excel-Vorlagen Download/Upload/Import |

### 2.3 Aktueller Stand v7.3.86

| Komponente | Status | Version |
|------------|--------|---------|
| Berater-Portal | Komplett | v7.3.86 |
| Firmen-Portal | Komplett | v7.3.86 |
| Zeiterfassung | Funktioniert | v7.3.86-1 |
| PortalHeader | Korrigiert | v7.3.86 |
| ProjectDetailPage | Korrigiert | v7.3.86 |
| TimesheetForm | Korrigiert | v7.3.86-1 |
| v7-types | Erweitert | v7.3.86 |
| WorkPackageTable | Funktioniert | v7.3.85-1 |
| Shared Components | Vollstaendig | v7.3.86 |
| ZIM PDF Parser | Komplett | v4.9 |

---

## 3. Abgeschlossen: v7.3.86 TypeScript-Korrekturen

### 3.1 Behobene Probleme

| Datei | Problem | Loesung |
|-------|---------|---------|
| PortalHeader | `userRole` Typ zu restriktiv | Akzeptiert jetzt `V7UserRole \| V7EmployeePortalRole \| string` |
| PortalHeader | `@supabase/auth-helpers-nextjs` fehlt | Geaendert zu `createClient` |
| PortalHeader | `hideNavigation` fehlte | Property hinzugefuegt |
| ProjectDetailPage | `employee_number` Typ falsch | Explizit `number \| null` (nicht optional) |
| ProjectDetailPage | WorkPackage/Employee Typ-Mapping | Explizites Mapping fuer Modal-Komponenten |
| TimesheetForm | `is_technical === 'true'` Vergleich | Korrigiert zu `=== true` |
| TimesheetForm | Jahr-Auswahl nur 2024-2027 | Erweitert auf 2020-2030 |
| v7-types | `employee_number` fehlte | Zu V7Employee hinzugefuegt (optional) |

### 3.2 Geaenderte Dateien

| Datei | Version |
|-------|---------|
| PortalHeader-v7_3_86.tsx | v7.3.86 |
| ProjectDetailPage-v7_3_86.tsx | v7.3.86 |
| TimesheetForm-v7_3_86-1.tsx | v7.3.86-1 |
| v7-types-v7_3_86.ts | v7.3.86 |
| deploy-v7_3_86.sh | v7.3.86 |

---

## 4. Naechster Build: v7.3.87 - Excel-Vorlagen

### 4.1 Anforderungen

| Feature | Beschreibung | Prioritaet |
|---------|--------------|------------|
| Excel-Download | Leere Vorlage fuer Projektdaten herunterladen | Hoch |
| Excel-Upload | Ausgefuellte Vorlage hochladen | Hoch |
| Excel-Import | Projektdaten aus Excel in DB importieren | Hoch |
| Validierung | Daten pruefen vor Import | Mittel |
| Fehlerhandling | Klare Fehlermeldungen bei ungueltigem Format | Mittel |

### 4.2 Excel-Vorlage Struktur (Entwurf)

```
Blatt 1: Projektdaten
- Projektname
- Kurzname
- Foerderkennzeichen
- Foerderformat
- Laufzeit (von/bis)

Blatt 2: Arbeitspakete
- AP-Nr | Name | Beschreibung | Von | Bis | PM | Technisch

Blatt 3: Mitarbeiter
- Nr | Name | Vorname | Qualifikation | Wochenstunden | Stundensatz

Blatt 4: MA-Zuordnung zu APs
- AP-Nr | MA-Nr | PM
```

### 4.3 Technische Umsetzung

- **Bibliothek**: xlsx (SheetJS) oder exceljs
- **Speicherort Vorlage**: `/public/templates/` oder Supabase Storage
- **Upload**: Drag & Drop Zone mit Validierung
- **Backend**: API-Route fuer Import-Logik

---

## 5. Geplantes Release: V7.4 - FZul-Integration

### 5.1 Migration von V6

Die FZul-Analyse-Funktionen aus V6 (main-Branch) werden in V7.4 ins Berater-Portal integriert:

| Funktion | V6 Status | V7.4 Planung |
|----------|-----------|--------------|
| FZul-Berechnung | Produktiv | Migration |
| Vorhaben-Verwaltung | Produktiv | Migration |
| MA-Kapazitaetsanalyse | Produktiv | Migration |
| Berichte/Export | Produktiv | Migration + Erweiterung |

### 5.2 Abhaengigkeit

V7.4 kann erst beginnen wenn:
1. v7.3.87 (Excel-Import) abgeschlossen ist
2. Pflichtenheft v7.3.87 dokumentiert ist

---

## 6. Architektur

### 6.1 Zentrale Erkenntnis

**Eine zentrale Codebasis mit rollen-basiertem Zugriff:**
- Shared Components in `/components/shared/`
- `portal`-Parameter steuert nur die Farbe (blau/gruen)
- Berechtigungen kommen aus der Datenbank

### 6.2 Header-Farbregel

| Portal | Header-Farbe | Bedeutung |
|--------|--------------|-----------|
| Berater | Blau (#002451) | "Ich bin Berater" |
| Firma | Gruen (#65A655) | "Ich bin Firmenmitarbeiter" |

Die Farbe zeigt **wer ICH bin**, nicht welche Daten ich sehe!

### 6.3 Komponenten-Hierarchie

```
src/
├── app/
│   ├── v7/berater/     # Berater-Portal Pages
│   └── v7/firma/       # Firmen-Portal Pages
├── components/
│   └── shared/         # Wiederverwendbare Komponenten
│       ├── PortalHeader.tsx
│       ├── ProjectDetailPage.tsx
│       ├── TimesheetForm.tsx
│       ├── WorkPackageTable.tsx
│       ├── WorkPackageEditModal.tsx
│       └── WorkPackageAssignmentModal.tsx
├── types/
│   └── v7-types.ts     # Zentrale TypeScript-Definitionen
└── lib/
    └── v7-constants.ts # Konstanten (Farben, HOURS_PER_PM, etc.)
```

---

## 7. Datenbank-Schema (Auszug)

### 7.1 v7_work_packages

```sql
CREATE TABLE v7_work_packages (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES v7_projects(id),
  ap_number INTEGER NOT NULL,
  ap_sub_number INTEGER,
  ap_code VARCHAR(20),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  total_person_months NUMERIC(10,2),
  is_technical BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 7.2 v7_project_assignments

```sql
CREATE TABLE v7_project_assignments (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES v7_projects(id),
  employee_id UUID REFERENCES v7_employees(id),
  employee_number INTEGER,  -- Lfd. Nr. aus Foerderantrag (Anlage 6.2)
  role_in_project TEXT,
  is_project_leader BOOLEAN DEFAULT false,
  hourly_rate NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 8. Git-Sicherung

### Aktueller Branch: v7-dev

```bash
cd ~/Documents/Dev/PZE
git add -A
git commit -m "v7.3.86-1: Jahr-Auswahl 2020-2030 wiederhergestellt"
git push origin v7-dev
```

### Naechster Commit (nach Excel-Implementation)

```bash
git commit -m "v7.3.87: Excel-Vorlagen Download/Upload/Import"
```

---

## 9. Aenderungshistorie

### v4.22 (25.01.2026)
- **NEU**: Versionierungsprinzip dokumentiert (Release.Version.Build-Iteration)
- **ABGESCHLOSSEN**: v7.3.86 TypeScript-Korrekturen
- **GEPLANT**: v7.3.87 Excel-Vorlagen
- **ROADMAP**: v7.4 FZul-Integration
- TimesheetForm Jahr-Auswahl 2020-2030 wiederhergestellt
- PortalHeader createClient statt auth-helpers
- ProjectDetailPage Typ-Mappings korrigiert

### v4.21 (25.01.2026)
- OFFENES PROBLEM: is_technical in TimesheetForm zeigt undefined
- WorkPackageTable T-Spalte funktioniert korrekt
- WorkPackageEditModal Checkbox hinzugefuegt
- Datumsformat auf TT.MM.JJ korrigiert

### v4.20 (23.01.2026)
- Mitarbeiter-Extraktion aus Anlage 6.2 im Parser
- Neue DB-Spalte `employee_number` in `v7_project_assignments`
- Team-Sortierung nach MA-Nummer aus Antrag

### v4.19 (23.01.2026)
- ZIM PDF Parser v4.8 komplett dokumentiert
- Formular-Typ-Erkennung mit eindeutigen Markern

### v4.18 (22.01.2026)
- Architektur-Visualisierung hinzugefuegt
- Erklaerung Shared Components vs. Pages

---

*Letzte Aktualisierung: 25. Januar 2026, 01:30 Uhr*
