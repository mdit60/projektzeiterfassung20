# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.23  
**SW-Release:** V7.3.86-4  
**Datum:** 03. Februar 2026  
**Projekt:** Projektzeiterfassung für FuE-Fördervorhaben  
**Status:** V7 Entwicklung - Fehlzeiten-Bug behoben, UI-Bereinigung abgeschlossen

---

## 1. Versionierungsprinzip

### 1.1 Schema

```
V[Release].[Version].[Build]-[Iteration]

Beispiel: v7.3.86-4
```

| Teil | Bedeutung | Erhöhung bei |
|------|-----------|---------------|
| **Release** (7) | Major Release | Große Feature-Änderungen (z.B. FZul-Integration) |
| **Version** (3) | Feature-Set | Neue Hauptfunktionen |
| **Build** (86) | Pflichtenheft-Stand | Dokumentation im Pflichtenheft |
| **Iteration** (-4) | Datei-Änderung | Jede einzelne Dateimodifikation |

### 1.2 Regeln

1. **Iteration**: Zählt bei JEDER Dateimodifikation hoch (-1, -2, -3...)
2. **Build**: Erhöhung NUR bei Pflichtenheft-Update (z.B. 86 → 87)
3. **Version**: Erhöhung bei neuem Feature-Set (z.B. 3 → 4)
4. **Release**: Erhöhung bei Major Changes (z.B. 7 → 8)

### 1.3 Dateinamen-Konvention

```
[Komponente]-v[Release]_[Version]_[Build]-[Iteration].tsx

Beispiele:
- TimesheetForm-v7_3_86-4.tsx
- ProjectDetailPage-v7_3_86-3.tsx
- PortalHeader-v7_3_86-3.tsx
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
| v7.3.86 | **Abgeschlossen** | Fehlzeiten-Bug, Header-Navigation, Umlaute |
| v7.3.87 | Nächster | Excel-Vorlagen Download/Upload/Import |

### 2.3 Aktueller Stand v7.3.86-4

| Komponente | Status | Version |
|------------|--------|---------|
| Login-Page | UTF-8 korrigiert | v7.3.86-1 |
| Berater-Dashboard | UTF-8 korrigiert | v7.3.86-2 |
| PortalHeader | Navigation entfernt | v7.3.86-3 |
| PortalNav | Umlaute korrigiert | v7.3.86-3 |
| ProjectDetailPage | Umlaute korrigiert | v7.3.86-3 |
| TimesheetForm | Fehlzeiten-Bug behoben | v7.3.86-4 |
| WorkPackageTable | Funktioniert | v7.3.85-1 |
| ZIM PDF Parser | Komplett | v4.9 |

---

## 3. Abgeschlossen: v7.3.86-4 (03. Februar 2026)

### 3.1 BUGFIX: Fehlzeiten-Speicherung

**Problem:** Fehlzeiten (Urlaub, Krankheit, Sonstige) wurden nicht in der Datenbank gespeichert. Beim Monatswechsel waren alle U/K/S-Einträge verschwunden.

**Ursache:** DB-Constraint `v7_timesheets_entry_type_check` erfordert:
- `work_package_id` und `absence_code` schließen sich gegenseitig aus
- Entweder: `work_package_id` gesetzt + `absence_code` NULL (normale Arbeit)
- Oder: `work_package_id` NULL + `absence_code` gesetzt (Fehlzeit)

**Lösung in TimesheetForm-v7_3_86-4.tsx:**
```typescript
// Bei Fehlzeiten: work_package_id auf null setzen
const record = {
  work_package_id: isAbsence ? null : row.workPackageId,
  hours: isAbsence ? DAILY_HOURS : parseFloat(entry.value),
  absence_code: isAbsence ? entry.value.toUpperCase() : null,
  // ...
};
```

**Lade-Logik angepasst:**
- Erkennt Fehlzeiten-Einträge (ohne work_package_id, mit absence_code)
- Zeigt sie in der ersten AP-Zeile an

### 3.2 UI-Korrektur: Doppelte Navigation entfernt

**Problem:** Im Firmen-Portal wurde die Navigation doppelt angezeigt - einmal im Header und einmal darunter in PortalNav.

**Regel:** Header zeigt nur "Wer bin ich":
- Logo / Initialen
- Firmenname / Portal-Typ
- User-Name + Dropdown (Abmelden)

**Lösung:** Navigation komplett aus PortalHeader entfernt (v7.3.86-3).

### 3.3 UTF-8 Umlaute korrigiert

| Datei | Vorher | Nachher |
|-------|--------|---------|
| login-page | •••• (kaputte Bullets) | "Passwort eingeben" |
| berater-page | Foerderberatung | Förderberatung |
| berater-page | Oeffnen | Öffnen |
| PortalNav | Foerderung | Förderung |
| ProjectDetailPage | Uebersicht | Übersicht |
| ProjectDetailPage | Zurueck | Zurück |
| ProjectDetailPage | fuer | für |

### 3.4 Geänderte Dateien

| Datei | Version | Änderung |
|-------|---------|----------|
| login-page-v7_3_86-1.tsx | v7.3.86-1 | UTF-8 Passwort/Footer |
| berater-page-v7_3_86-2.tsx | v7.3.86-2 | Umlaute, Untertitel entfernt |
| PortalHeader-v7_3_86-3.tsx | v7.3.86-3 | Navigation komplett entfernt |
| PortalNav-v7_3_86-3.tsx | v7.3.86-3 | Förderung Umlaut |
| ProjectDetailPage-v7_3_86-3.tsx | v7.3.86-3 | Alle Umlaute korrigiert |
| TimesheetForm-v7_3_86-4.tsx | v7.3.86-4 | Fehlzeiten-Bug behoben |

---

## 4. Offene TODO-Liste

### 4.1 Bekannte UI-Stellen mit ue/oe/ae (niedrige Priorität)

Diese Stellen können bei Gelegenheit korrigiert werden:

| Stelle | Text | Korrektur |
|--------|------|-----------|
| Zeiterfassungs-Tab | "fuer DigiTrans" | "für DigiTrans" |
| Zeiterfassungs-Tab | "oeffnen" | "öffnen" |
| Diverse Seiten | "auffuehren" | "aufführen" |

### 4.2 Speichern-Dialog (zu testen)

Der Unsaved-Changes-Dialog sollte jetzt 3 Buttons haben:
- Abbrechen (Dialog schließen)
- Verwerfen (ohne Speichern wechseln)
- Speichern (speichern und wechseln)

---

## 5. Nächster Build: v7.3.87 - Excel-Vorlagen

### 5.1 Anforderungen

| Feature | Beschreibung | Priorität |
|---------|--------------|------------|
| Excel-Download | Leere Vorlage für Projektdaten herunterladen | Hoch |
| Excel-Upload | Ausgefüllte Vorlage hochladen | Hoch |
| Excel-Import | Projektdaten aus Excel in DB importieren | Hoch |
| Validierung | Daten prüfen vor Import | Mittel |
| Fehlerhandling | Klare Fehlermeldungen bei ungültigem Format | Mittel |

### 5.2 Excel-Vorlage Struktur (Entwurf)

```
Blatt 1: Projektdaten
- Projektname
- Kurzname
- Förderkennzeichen
- Förderformat
- Laufzeit (von/bis)

Blatt 2: Arbeitspakete
- AP-Nr | Name | Beschreibung | Von | Bis | PM | Technisch

Blatt 3: Mitarbeiter
- Nr | Name | Vorname | Qualifikation | Wochenstunden | Stundensatz

Blatt 4: MA-Zuordnung zu APs
- AP-Nr | MA-Nr | PM
```

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

- **Vercel:** Deployed (03. Februar 2026)
- **Branch:** v7-dev
- **Supabase:** Produktiv

### 7.2 Git-Befehle

```bash
cd ~/Documents/Dev/PZE

# Commit
git add -A
git commit -m "v7.3.86-4: Fehlzeiten-Bug, Header-Navigation, Umlaute"
git push origin v7-dev
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

---

**Ende des Pflichtenhefts v4.23**
