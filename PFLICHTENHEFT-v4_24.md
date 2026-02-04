# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.24  
**SW-Release:** V7.3.87-final  
**Datum:** 05. Februar 2026  
**Projekt:** Projektzeiterfassung für FuE-Fördervorhaben  
**Status:** V7 Entwicklung - Excel-Arbeitsplan Import abgeschlossen

---

## 1. Versionierungsprinzip

### 1.1 Schema

```
V[Release].[Version].[Build]-[Iteration]

Beispiel: v7.3.87-final
```

| Teil | Bedeutung | Erhöhung bei |
|------|-----------|---------------|
| **Release** (7) | Major Release | Große Feature-Änderungen (z.B. FZul-Integration) |
| **Version** (3) | Feature-Set | Neue Hauptfunktionen |
| **Build** (87) | Pflichtenheft-Stand | Dokumentation im Pflichtenheft |
| **Iteration** (-final) | Datei-Änderung | Jede einzelne Dateimodifikation |

### 1.2 Regeln

1. **Iteration**: Zählt bei JEDER Dateimodifikation hoch (-1, -2, -3...)
2. **Build**: Erhöhung NUR bei Pflichtenheft-Update (z.B. 87 → 88)
3. **Version**: Erhöhung bei neuem Feature-Set (z.B. 3 → 4)
4. **Release**: Erhöhung bei Major Changes (z.B. 7 → 8)

### 1.3 Dateinamen-Konvention

```
[Komponente]-v[Release]_[Version]_[Build]-[Iteration].tsx

Beispiele:
- arbeitsplan-import-route-v7_3_87-final.ts
- ProjectDetailPage-v7_3_86-3.tsx
```

---

## 2. Projektstatus Übersicht

### 2.1 Release-Planung

| Release | Status | Inhalt |
|---------|--------|--------|
| **V7.3** | Aktiv | Berater-Portal + Firmen-Portal + Zeiterfassung |
| **V7.4** | Geplant | FZul-Integration im Berater-Portal |

### 2.2 Build-Planung V7.3

| Build | Status | Inhalt |
|-------|--------|--------|
| v7.3.86 | Abgeschlossen | Fehlzeiten-Bug, Header-Navigation, Umlaute |
| v7.3.87 | **Abgeschlossen** | Team-Management, Excel-Arbeitsplan Import |
| v7.3.88 | Nächster | (offen) |

### 2.3 Aktueller Stand v7.3.87-final

| Komponente | Status | Version |
|------------|--------|---------|
| Team-Management | ✅ Fertig | v7.3.87 |
| Excel-Vorlage Download | ✅ Fertig | v7.3.87 |
| Excel-Import mit Vorschau | ✅ Fertig | v7.3.87-final |
| ProjectDetailPage | Funktioniert | v7.3.86-3 |
| TimesheetForm | Funktioniert | v7.3.86-4 |
| WorkPackageTable | Funktioniert | v7.3.85-1 |
| ZIM PDF Parser | Komplett | v4.9 |

---

## 3. Abgeschlossen: v7.3.87-final (05. Februar 2026)

### 3.1 Team-Management

**Funktion:** Projektspezifisches Team verwalten

| Feature | Beschreibung |
|---------|--------------|
| MA hinzufügen | MA aus Firmenstamm zum Projekt hinzufügen |
| Lfd. Nr. | Projektspezifische MA-Nummer (1, 2, 3...) |
| Stundensatz | Projektspezifischer Override möglich |
| Rolle | Rolle im Projekt (Projektleiter, Entwickler, etc.) |
| Zeitraum | Von/Bis Datum der Projekttätigkeit |
| MA entfernen | Nur möglich wenn KEINE Zeiterfassung vorhanden |

**Lösch-Prüfung:**
```typescript
// Prüfen ob MA Zeiterfassung hat
const { count } = await supabase
  .from('v7_timesheets')
  .select('*', { count: 'exact', head: true })
  .eq('employee_id', employeeId)
  .eq('project_id', projectId);

if (count > 0) {
  // Löschen verweigern - Meldung anzeigen
}
```

### 3.2 Excel-Arbeitsplan Vorlage

**Vorlage-Download:** Projektspezifische Excel-Vorlage mit:

| Zeile | Inhalt |
|-------|--------|
| 1 | Metadaten: Projekt-ID, FKZ, Name |
| 2 | Leer |
| 3 | Header: AP-Nr, Beschreibung, von, bis, MA1, MA2, ... |
| 4+ | Arbeitspakete-Daten |
| 50+ | Hinweise zur Formatierung |

**Spalten-Struktur:**
- A: AP-Nr. (1, 1.1, 2, 2.1, etc.)
- B: Beschreibung
- C: von (Datum YYYY-MM-DD)
- D: bis (Datum YYYY-MM-DD)
- E+: MA-Spalten (PM-Werte als Dezimalzahl)

**Hinweise in Vorlage:**
```
- AP-Nr.: Format 1, 1.1, 2.1.3 etc. (entsprechend Anlage 6.2 des Antrags)
- von/bis: Datum im Format TT.MM.JJJJ
- PM: Personenmonate als Dezimalzahl (z.B. 1,5)
- AP Summe PM: Wird automatisch berechnet
- Leere PM-Zellen werden als 0 interpretiert
- Die gelbe Beispielzeile vor dem Upload löschen!
```

### 3.3 Excel-Import mit Vorschau

**Import-Dialog zeigt Vorschau mit:**

| Kategorie | Bedeutung |
|-----------|-----------|
| Neue APs | APs die in Excel, aber nicht in DB sind → werden angelegt |
| Updates | APs die in beiden existieren, aber unterschiedliche Daten haben |
| Unverändert | APs die identisch in Excel und DB sind → keine Aktion |

**Update-Anzeige zeigt konkrete Änderungen:**
```
AP4: • Ende: 2026-12-31 → 2026-11-30
AP7: • Name: "Validierung und Dokumentation" → "Validierung"
     • Start: 2027-04-01 → 2027-03-01
     • PM: 1.5 → 2
```

### 3.4 Import-Logik (WICHTIG!)

> **Grundprinzip:** Der Import kann nur HINZUFÜGEN und AKTUALISIEREN, niemals LÖSCHEN.

| Situation | Import-Verhalten |
|-----------|------------------|
| AP in Excel, nicht in DB | **Neu anlegen** |
| AP in Excel UND in DB (geändert) | **Aktualisieren** |
| AP in Excel UND in DB (identisch) | **Ignorieren** (keine Aktion) |
| AP in DB, nicht in Excel | **Ignorieren** (bleibt bestehen!) |

**Konsequenzen für Anwender:**

1. **Einzelne APs ändern:** Man kann eine Vorlage mit nur einem AP hochladen - alle anderen vorhandenen APs bleiben unberührt.

2. **APs löschen:** Ist via Import **NICHT möglich**. Löschen muss manuell im Portal erfolgen.

**Begründung für kein automatisches Löschen:**
- **Sicherheit:** Verhindert versehentliches Löschen durch alte/falsche Vorlage
- **Zeiterfassung:** Gelöschte APs könnten bereits gebuchte Stunden haben
- **Audit-Trail:** Löschungen sollten bewusste manuelle Aktionen sein

### 3.5 Technische Details Import

**Datei:** `src/app/api/v7/arbeitsplan-import/route.ts`

**Parser-Funktionen:**

```typescript
// AP-Nummer parsen (unterstützt number UND string)
function parseAPNumber(apStr: any) {
  // Zahl direkt: 1, 2, 3...
  if (typeof apStr === 'number') {
    if (Number.isInteger(apStr)) {
      return { ap_number: apStr, ap_sub_number: null, ap_code: `AP${apStr}` };
    }
    // Dezimal: 1.1, 2.3...
    const str = apStr.toString();
    const parts = str.split('.');
    return { 
      ap_number: parseInt(parts[0]), 
      ap_sub_number: parseInt(parts[1]),
      ap_code: `AP${parts[0]}.${parts[1]}`
    };
  }
  // String: "1", "1.1", "AP1", "AP1.1"...
  // ... (siehe Code)
}

// Datum parsen (Excel datetime + serial date)
function parseDate(value: any) {
  // String: "2026-05-01 00:00:00"
  if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return value.substring(0, 10);
  }
  // Excel serial date (number like 46143)
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const jsDate = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return jsDate.toISOString().split('T')[0];
  }
}
```

**DB-Feldnamen-Mapping:**

| Excel-Parser | DB-Tabelle | DB-Feld |
|--------------|------------|---------|
| total_pm | v7_work_packages | total_person_months |
| planned_pm | v7_work_package_assignments | planned_person_months |

**Hinweis-Zeilen-Filter:**
Zeilen ab Zeile 50+ die mit folgenden Texten beginnen werden ignoriert (ohne Warnung):
- `Hinweise:`
- `-` (Aufzählungszeichen)
- `Projekt:`
- `FKZ:`
- `Team:`

### 3.6 Geänderte/Neue Dateien v7.3.87

| Datei | Version | Beschreibung |
|-------|---------|--------------|
| arbeitsplan-import-route-v7_3_87-final.ts | v7.3.87-final | Import API mit Vorschau |
| ProjectDetailPage | v7.3.87 | Team-Management Tab |
| arbeitsplan-vorlage-route.ts | v7.3.87 | Vorlage-Download API |

---

## 4. Offene TODO-Liste

### 4.1 Bekannte UI-Stellen mit ue/oe/ae (niedrige Priorität)

| Stelle | Text | Korrektur |
|--------|------|-----------|
| Zeiterfassungs-Tab | "fuer DigiTrans" | "für DigiTrans" |
| Zeiterfassungs-Tab | "oeffnen" | "öffnen" |

### 4.2 Speichern-Dialog (zu testen)

Der Unsaved-Changes-Dialog sollte 3 Buttons haben:
- Abbrechen (Dialog schließen)
- Verwerfen (ohne Speichern wechseln)
- Speichern (speichern und wechseln)

---

## 5. Nächster Build: v7.3.88 - (offen)

Mögliche Themen:
- FZul-Integration vorbereiten
- Deminimis-Datenbank Feature
- Weitere UI-Verbesserungen

---

## 6. Geplantes Release: V7.4 - FZul-Integration

### 6.1 Anforderungen

Migration der FZul-Funktionalität aus V6 main-Branch:

| Feature | Beschreibung |
|---------|--------------|
| Vorhaben-Verwaltung | FZul-Vorhaben anlegen und verwalten |
| FZul-Berechnung | Automatische Berechnung der Forschungszulage |
| MA-Kapazitätsanalyse | Verfügbare FuE-Zeiten pro Mitarbeiter |
| Berichte/Export | FZul-Berichte generieren |

### 6.2 Konzept

Siehe: `KONZEPT-FZUL-ONLINE-EDITOR.md`

---

## 7. Deployment-Info

### 7.1 Aktueller Stand

- **Vercel:** Deployed (05. Februar 2026)
- **Branch:** v7-dev / main
- **Commit:** 2466681 (v7.3.87-final)
- **Supabase:** Produktiv

### 7.2 Git-Befehle

```bash
cd ~/Documents/Dev/PZE

# Aktueller Status
git log -3 --oneline
# 2466681 (HEAD -> main) v7.3.87-final: Excel-Import fertiggestellt
# 9f41411 v7.3.87-1: Bugfixes Team-Management
# d18851b (origin/v7-dev, origin/main) v7.3.87: Team-Management und Excel-Arbeitsplan Import

# Sync main zu origin
git push origin main
```

---

## 8. Architektur-Hinweise

### 8.1 Header-Farbregel

> **"Wer bin ICH"** - nicht "welche Daten sehe ich"

| Portal | Header-Farbe | Navigation |
|--------|--------------|------------|
| Berater-Portal | Blau (#002451) | Immer blau |
| Firmen-Portal | Grün (#65A655) | Immer grün |

**Wichtig:** Auch wenn ein Berater Firmendaten ansieht, bleibt der Header BLAU!

### 8.2 Shared Components

Alle UI-Komponenten liegen in `/components/shared/`:
- Beide Portale nutzen DIESELBEN Komponenten
- `portal`-Parameter steuert die Farbe
- NIE Code duplizieren!

### 8.3 DB-Constraint für Timesheets

```sql
CHECK (
  (work_package_id IS NOT NULL AND absence_code IS NULL) 
  OR 
  (work_package_id IS NULL AND absence_code IS NOT NULL)
)
```

- Normale Arbeit: `work_package_id` gesetzt, `absence_code` NULL
- Fehlzeit (U/K/S): `work_package_id` NULL, `absence_code` gesetzt

### 8.4 Personenmonate-Berechnung

```
1 PM = 173,33 Stunden
(40 Stunden/Woche × 52 Wochen / 12 Monate)
```

---

## 9. Geplante Dokumentation

### 9.1 User Manuals (für Produktivversion)

| Manual | Zielgruppe | Inhalt |
|--------|------------|--------|
| Firmen-Portal Manual | Firmennutzer | Zeiterfassung, Arbeitspakete, Team-Ansicht |
| Berater-Portal Manual | Berater | Firmenverwaltung, Projekte, Imports, Reports |

**Merker:** User Manuals werden erstellt sobald Produktivversion fertig ist.

---

**Ende des Pflichtenhefts v4.24**
