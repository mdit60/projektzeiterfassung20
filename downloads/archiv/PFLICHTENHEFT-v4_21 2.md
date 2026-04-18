# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.21  
**SW-Release:** V7.3.85  
**Datum:** 25. Januar 2026  
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben  
**Status:** V7 Entwicklung - is_technical Problem in Zeiterfassung OFFEN

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
| Berater-Portal | **Komplett** | v7.3.85 |
| Firmen-Portal | **Komplett** | v7.3.85 |
| Zeiterfassung | **T-Spalte Problem** | v7.3.85-5 |
| WorkPackageTable | **Funktioniert** | v7.3.85-1 |
| Shared Components | **Vollstaendig** | v7.3.85 |
| ZIM PDF Parser | **Komplett** | v4.8 |
| FZul-Migration | Ausstehend | Phase 4 |

---

## 2. OFFENES PROBLEM: is_technical in Zeiterfassung

### 2.1 Symptom

Die T-Spalte (Technisches Arbeitspaket) funktioniert **korrekt** in der WorkPackageTable (Arbeitsplan), zeigt aber in der TimesheetForm (Zeiterfassung) immer `undefined` an, obwohl:

- Das WorkPackage Interface in beiden Dateien `is_technical?: boolean | null` hat
- Der Supabase Query `is_technical` explizit laedt
- Die Datenbank korrekte Werte hat (true/false, Typ: boolean)

### 2.2 Was funktioniert

1. **WorkPackageTable** (Arbeitsplan Tab in Projekt-Detail):
   - T-Spalte zeigt korrekt "X" fuer technische APs (AP4, AP4.1, AP4.2, AP4.3)
   - T-Spalte zeigt korrekt "-" fuer nicht-technische APs (AP1, AP2.1, AP2.2, AP3, AP5)
   - Logik: `wp.is_technical !== false`

2. **Datenbank** (v7_work_packages):
   ```sql
   SELECT ap_code, is_technical, pg_typeof(is_technical) FROM v7_work_packages;
   -- AP4.1 | true | boolean
   -- AP1   | false | boolean
   ```

### 2.3 Was NICHT funktioniert

**TimesheetForm** (Zeiterfassung):
- Console zeigt: `selectedWP: AP4.1 is_technical: undefined type: undefined`
- Obwohl die Page den Query mit `is_technical` macht
- Obwohl das Interface `is_technical` definiert hat
- Obwohl die WorkPackages korrekt an TimesheetForm uebergeben werden

### 2.4 Dateien die bearbeitet wurden

| Datei | Aenderung | Status |
|-------|-----------|--------|
| page-firma-zeiterfassung | Interface + Query mit is_technical | OK |
| TimesheetForm | Interface + T-Spalten-Logik | OK |
| WorkPackageTable | T-Spalte Anzeige | Funktioniert |
| WorkPackageEditModal | Checkbox fuer is_technical | OK |
| migration-v7_3_85-is-technical.sql | DB-Spalte hinzugefuegt | Ausgefuehrt |

### 2.5 Vermutete Ursache

Der Datenfluss wird irgendwo unterbrochen:
```
Supabase -> page-firma-zeiterfassung -> TimesheetForm -> selectedWP
                                                              ^
                                                              |
                                                        is_technical = undefined
```

Moegliche Ursachen:
1. Next.js Cache-Problem (trotz rm -rf .next)
2. TypeScript kompiliert zu einem anderen Interface
3. workPackages werden irgendwo neu gemappt ohne is_technical
4. Props werden nicht korrekt durchgereicht

### 2.6 Naechste Schritte zur Loesung

1. **Debug in loadWorkPackages**: Console.log wurde hinzugefuegt, erscheint aber nicht
2. **Pruefen ob loadWorkPackages ueberhaupt aufgerufen wird**
3. **workPackages State direkt in TimesheetForm loggen** (vor dem find())
4. **Alternativer Ansatz**: is_technical direkt in TimesheetForm aus DB laden statt ueber Props

---

## 3. Architektur

### 3.1 Zentrale Erkenntnis

**Eine zentrale Codebasis mit rollen-basiertem Zugriff:**
- Shared Components in `/components/shared/`
- `portal`-Parameter steuert nur die Farbe (blau/gruen)
- Berechtigungen kommen aus der Datenbank

### 3.2 Header-Farbregel

| Portal | Header-Farbe | Bedeutung |
|--------|--------------|-----------|
| Berater | Blau (#002451) | "Ich bin Berater" |
| Firma | Gruen (#65A655) | "Ich bin Firmenmitarbeiter" |

Die Farbe zeigt **wer ICH bin**, nicht welche Daten ich sehe!

---

## 4. Durchgefuehrte Aenderungen v7.3.85

### 4.1 Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| migration-v7_3_85-is-technical.sql | ALTER TABLE v7_work_packages ADD is_technical BOOLEAN |
| WorkPackageTable-v7_3_85-1.tsx | T-Spalte, TT.MM.JJ Datumsformat |
| WorkPackageEditModal-v7_3_85-1.tsx | Checkbox "Technisches AP" bei ZIM_DS |
| TimesheetForm-v7_3_85-5.tsx | T-Spalte Logik (funktioniert nicht) |
| ProjectDetailPage-v7_3_85-3.tsx | PM-Mapping, WorkPackageTable Integration |
| page-firma-zeiterfassung-v7_3_85-2.tsx | is_technical im Interface und Query |
| page-berater-zeiterfassung-v7_3_85-1.tsx | is_technical im Query |

### 4.2 Was funktioniert

- Arbeitsplan-Tabelle mit Excel-Style Layout
- Inline PM-Editing
- T-Spalte in WorkPackageTable (Arbeitsplan)
- Datumsformat TT.MM.JJ
- AP-Dropdown in Zeiterfassung ohne "AP" Prefix (nur Nummer)
- Checkbox "Technisches AP" im WorkPackageEditModal

### 4.3 Was NICHT funktioniert

- T-Spalte in TimesheetForm (Zeiterfassung) - zeigt immer "-"

---

## 5. Datenbank-Schema (Auszug)

### 5.1 v7_work_packages

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
  is_technical BOOLEAN DEFAULT true,  -- NEU v7.3.85
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. Git-Sicherung

### Aktueller Branch: v7-dev

```bash
cd ~/Documents/Dev/PZE
git add -A
git commit -m "v7.3.85: is_technical T-Spalte (WorkPackageTable OK, TimesheetForm OFFEN)"
git push origin v7-dev
```

---

## 7. Aenderungshistorie

### v4.21 (25.01.2026)
- **OFFENES PROBLEM**: is_technical in TimesheetForm zeigt undefined
- WorkPackageTable T-Spalte funktioniert korrekt
- WorkPackageEditModal Checkbox hinzugefuegt
- Datumsformat auf TT.MM.JJ korrigiert
- AP-Dropdown nur Nummer ohne "AP" Prefix
- Viele Iterationsversionen erstellt (-1, -2, -3, etc.)

### v4.20 (23.01.2026)
- Mitarbeiter-Extraktion aus Anlage 6.2 im Parser
- Neue DB-Spalte `employee_number` in `v7_project_assignments`
- Team-Sortierung nach MA-Nummer aus Antrag
- ProjectDetailPage v7.3.81

### v4.19 (23.01.2026)
- ZIM PDF Parser v4.8 komplett dokumentiert
- Formular-Typ-Erkennung mit eindeutigen Markern
- Projekttraeger-Zuordnung 2025 dokumentiert

### v4.18 (22.01.2026)
- Architektur-Visualisierung (Shared Components vs. Pages) hinzugefuegt
- Erklaerung warum zwei Pages fuer eine Funktion benoetigt werden
- Projektdateien aufgeraeumt

---

*Letzte Aktualisierung: 25. Januar 2026, 23:30 Uhr*
