# KONZEPT: NWM Datenmodell-Korrektur
# Version 1.0
# Stand: 3. April 2026 (Karfreitag)
# Status: FREIGEGEBEN ZUR IMPLEMENTIERUNG

---

## 1. Ausgangslage und Problem

### 1.1 Bisherige (fehlerhafte) Modellierung

Das ZIM-Netzwerk-Modul wurde urspruenglich so modelliert, dass Phase 1 und Phase 2
eines Innovationsnetzwerks als **ein einziges Datenbankprojekt** abgebildet werden,
mit phasenspezifischen Feldern:

- `bewilligung_datum` = Startdatum Phase 1
- `phase2_start_datum` = Startdatum Phase 2
- `netzwerk_phase` = aktuell aktive Phase ('phase1' | 'phase2')

### 1.2 Korrekte fachliche Realitaet

Phase 1 und Phase 2 eines ZIM-Innovationsnetzwerks sind **rechtlich und
abrechnungstechnisch vollstaendig eigenstaendige Projekte**:

- Jede Phase hat einen eigenen Zuwendungsbescheid
- Jede Phase wird separat beim Projekttraeger beantragt
- Jede Phase hat eigene Laufzeit, eigene Foerderkonditionen, eigene ZA-Abrechnung
- Netzwerkpartner koennen zwischen den Phasen ausscheiden oder neu eintreten
- Die einzige inhaltliche Verbindung: Phase 2 setzt voraussetzungsbedingt
  den erfolgreichen Abschluss von Phase 1 voraus

### 1.3 Produktivdaten

Aktuell existiert **ein ZIM_NETZWERK-Projekt in PROD**:
- Name: ZIM Innovationsnetzwerk Yacht Connect
- ID: 5d73f3d3-b6c5-4368-b753-1dcf38c16102
- Phase: phase2
- 3 Eigenanteil-Abrechnungen (EA) bereits vorhanden und korrekt berechnet

---

## 2. Zielmodell

### 2.1 Grundprinzip

**Ein ZIM_NETZWERK-Projekt in PZE = Eine Foerderphase**

Jede Phase wird als vollstaendig eigenstaendiges Projekt angelegt,
identisch wie ZIM-Einzelprojekte. Die Phasenzugehoerigkeit (`phase1` | `phase2`)
ist ein reines Attribut ohne strukturelle Sonderbehandlung.

### 2.2 Felder in v7_projects (nach Korrektur)

| Feld | Bedeutung | Status |
|------|-----------|--------|
| `funding_format` | 'ZIM_NETZWERK' | unveraendert |
| `netzwerk_typ` | 'national' / 'international' | unveraendert |
| `netzwerk_phase` | 'phase1' / 'phase2' | unveraendert (nur Attribut) |
| `bewilligung_datum` | Datum des Zuwendungsbescheids | **bleibt, neue Bedeutung** |
| `start_date` | Startdatum der Phase (Laufzeitbeginn) | unveraendert |
| `end_date` | Enddatum der Phase | unveraendert |
| `phase2_start_datum` | (veraltet) | **wird auf NULL gesetzt, Spalte bleibt vorerst** |
| `foerdersatz_stufen` | gestaffelte Foerdersaetze | unveraendert |
| alle `nwm_bank_*` | Bankdaten Cubintec | unveraendert |
| `nwm_ust_id` | USt-ID Cubintec | unveraendert |
| `nwm_rechnung_*` | Rechnungskonfiguration | unveraendert |
| `nwm_faelligkeitsfrist` | Zahlungsfrist Tage | unveraendert |

### 2.3 Bedeutung von bewilligung_datum (praezisiert)

`bewilligung_datum` = Datum des Zuwendungsbescheids des Projekttraegers
fuer diese Phase. Wird in ZA-Dokumenten referenziert und dient als
Basis fuer die Laufzeitjahr-Berechnung gemaess ZIM-Richtlinie 2024:

```
Laufzeitjahr = CEIL((ZA_zeitraum_bis - bewilligung_datum) / 365.25)
```

Dieses Feld ist NICHT identisch mit `start_date` (dem tatsaechlichen
Laufzeitbeginn), kann aber das gleiche Datum haben.

---

## 3. Datenmigration YachtConnect PROD

### 3.1 Aktueller Ist-Zustand

```json
{
  "id": "5d73f3d3-b6c5-4368-b753-1dcf38c16102",
  "name": "ZIM Innovationsnetzwerk Yacht Connect",
  "netzwerk_phase": "phase2",
  "bewilligung_datum": "2025-08-01",
  "phase2_start_datum": "2027-07-31",
  "start_date": "2025-08-01",
  "end_date": "2027-07-31",
  "foerdersatz_stufen": [
    {"laufzeitjahr": 1, "satz_percent": 70, "gueltig_ab": "2027-07-31"},
    {"laufzeitjahr": 2, "satz_percent": 50, "gueltig_ab": "2028-07-31"},
    {"laufzeitjahr": 3, "satz_percent": 30, "gueltig_ab": "2029-07-31"},
    {"laufzeitjahr": 4, "satz_percent": 30, "gueltig_ab": "2030-07-31"}
  ]
}
```

### 3.2 Erforderliche Korrekturen

**ACHTUNG:** Die `foerdersatz_stufen` enthalten unter `gueltig_ab` aktuell
das Datum aus `phase2_start_datum` (2027-07-31), was fachlich falsch ist.
Das korrekte Startdatum der Phase 2 ist `start_date` = 2025-08-01.

Die Stufen muessen korrigiert werden:

```sql
UPDATE v7_projects SET
  phase2_start_datum  = NULL,
  foerdersatz_stufen  = '[
    {"laufzeitjahr": 1, "satz_percent": 70, "gueltig_ab": "2025-08-01"},
    {"laufzeitjahr": 2, "satz_percent": 50, "gueltig_ab": "2026-08-01"},
    {"laufzeitjahr": 3, "satz_percent": 30, "gueltig_ab": "2027-08-01"},
    {"laufzeitjahr": 4, "satz_percent": 30, "gueltig_ab": "2028-08-01"}
  ]'::jsonb
WHERE id = '5d73f3d3-b6c5-4368-b753-1dcf38c16102';
```

**Hinweis zu bewilligung_datum:**
`bewilligung_datum = 2025-08-01` ist korrekt (= Datum Zuwendungsbescheid Phase 2).
Bleibt unveraendert.

**Hinweis zu den 3 EA-Datensaetzen:**
Die bestehenden Eigenanteil-Abrechnungen enthalten eingefrorene Snapshots
(Laufzeitjahr, Foerdersatz, NWM-Kosten). Diese Daten sind inhaltlich korrekt
(alle Jahr 1, 70%) und werden **nicht veraendert**. Nur die Anzeige im
Archiv-Panel wird bereinigt (Spalten Laufzeitjahr und Foerdersatz entfernen).

### 3.3 Offene Frage vor Migration

**Muss mit Martin/Katrin geklaert werden:**
Ist das Bewilligungsdatum Phase 2 von YachtConnect tatsaechlich der 01.08.2025,
oder gibt es ein abweichendes Datum des Zuwendungsbescheids Phase 2?

---

## 4. UI-Aenderungen NWMEinstellungenPanel

### 4.1 Foerderparameter-Anzeige (neu)

```
FOERDERPARAMETER
Netzwerktyp              Foerderphase
Nationales Innovationsnetz.  Phase 2 (Umsetzung)

Bewilligungsdatum        Startdatum           Enddatum
01.08.2025               01.08.2025           31.07.2027
```

### 4.2 Bearbeitungs-Modal (neu)

- Feld "Bewilligungsdatum" (= `bewilligung_datum`) — Pflichtfeld
- Feld "Startdatum" (= `start_date`) — Pflichtfeld
- Feld "Enddatum" (= `end_date`) — Pflichtfeld
- Feld "Startdatum Phase 2" entfaellt komplett

### 4.3 Stufen-Berechnung (angepasst)

Basisdatum fuer automatische Stufen-Berechnung = `start_date` (nicht mehr
`bewilligung_datum` oder `phase2_start_datum`).

---

## 5. Implementierungsreihenfolge

### Schritt 1 — SQL-Migration DEV
- `phase2_start_datum` auf NULL setzen (Spalte bleibt)
- `foerdersatz_stufen` mit korrekten Daten neu befuellen
- Verification-Queries ausfuehren

### Schritt 2 — NWMEinstellungenPanel-v7_4_5-3
- Neue UI gemaess Abschnitt 4
- `start_date` und `end_date` als editierbare Felder ins Panel aufnehmen
- Stufen-Berechnung auf `start_date` umstellen
- `phase2_start_datum` vollstaendig entfernen

### Schritt 3 — NWMEigenanteilPanel (Archiv-Ansicht)
- Spalten "Laufzeitjahr" und "Foerdersatz" aus Archiv-Tabelle entfernen
- Diese Daten bleiben in der DB, werden nur nicht mehr angezeigt

### Schritt 4 — ZAPanel
- Laufzeitjahr-Berechnung auf `bewilligung_datum` belassen (bereits korrekt)
- Referenzen auf `phase2_start_datum` entfernen

### Schritt 5 — SQL-Migration PROD
- Identisch wie DEV, aber mit den produktiven YachtConnect-Daten
- Erst nach erfolgreichem DEV-Test

### Schritt 6 — Deploy
- v7-dev push
- main merge + push

---

## 6. Nicht betroffene Komponenten

- `v7_netzwerk_partner` — unveraendert
- `v7_netzwerk_eigenanteile` — unveraendert (Daten bleiben)
- `v7_zahlungsanforderungen` — unveraendert
- NWMPartnerPanel — unveraendert
- ZAPanel (Foerdersatz-Logik) — nur minimale Anpassung (Schritt 4)

---

## 7. Offene Punkte

| # | Thema | Klaerungsbedarf |
|---|-------|-----------------|
| 1 | Bewilligungsdatum YachtConnect Phase 2 | Ist 01.08.2025 korrekt? |
| 2 | `phase2_start_datum` Spalte droppen | Wann? Naechste grosse DB-Migration |
| 3 | Phase 1 YachtConnect | Wird nicht in PZE abgebildet (abgeschlossen) |

---

## 8. Einordnung im Pflichtenheft

Ersetzt / ergaenzt Konzept KONZEPT-ZIM-NETZWERKMANAGEMENT-v1_2.md Abschnitt 1-2.
Pflichtenheft-Update: v4.56, Abschnitt 6.7 NWM-Modul anpassen.
