# KONZEPT: NWM Datenmodell-Korrektur
# Version 1.1
# Stand: 5. April 2026 (Ostersonntag)
# Aenderungen gg. v1.0:
#   - Abschnitt 5: Analyse ZA-Formular Innovationsnetzwerke (Version 3.00, 24.06.2025)
#   - Abschnitt 6: Analyse Leistungsbestaetigung / Nachweis Eigenbeteiligung (Anlage 7.1a)
#   - Abschnitt 7: Konsequenzen fuer Datenmodell v7_netzwerk_eigenanteile
#   - Abschnitt 8: Stundennachweis NWM bestaetigt
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

## 5. Analyse ZA-Formular Innovationsnetzwerke (Version 3.00, Stand 24.06.2025)

### 5.1 Struktur

Das NWM-ZA-Formular (6 Seiten) ist strukturell aehnlich wie ZIM-Einzelprojekt-ZA,
mit folgenden NWM-spezifischen Besonderheiten:

**Deckblatt (Seite 2):**
- Förderkennzeichen, Datum Zuwendungsbescheid
- Abrechnungszeitraum von/bis
- Innovationsnetzwerk (Name)
- Bewilligte Zuwendung / davon noch verfuegbar
- Kostenarten-Tabelle:
  - Personal (lt. Anlage 1b)
  - Zuschlag fuer uebrige Kosten [%] — pauschal
  - Auftraege an Dritte (lt. Anlage 1c)
  - Summe
- Je Kostenart: entstandene Kosten + Foerdersatz [%] + anteilige Zuwendung

**Anlage 1a — Abrechnung foerderfaehige Personenstunden:**
- Je Netzwerkmanager: Name, Monat, Stunden je Monat, Summe [h]
- Basis fuer Anlage 1b

**Anlage 1b — Abrechnung zuwendungsfaehige Personalkosten:**
- Je Netzwerkmanager: foerderfaehige Stunden (aus 1a) × bewilligter Stundensatz
- = entstandene zuwendungsfaehige Personalkosten

**Anlage 1c — Auftraege an Dritte:**
- Liste: Kurzbezeichnung Auftrag + Auftragnehmer, Abrechnungstermin, Kosten (netto)

**Anlage 1d:**
- Verweise auf ZA-Formulare der FuE-Einzelprojekte aus dem Netzwerk
- Betrifft nicht das NWM selbst, nur fuer Vollstaendigkeit relevant

### 5.2 Fazit ZA

Kein separates ZA-Modul erforderlich. Das bestehende ZA-Panel wird mit
NWM-spezifischen Feldern erweitert (wie in KONZEPT-ZIM-NETZWERKMANAGEMENT-v1_2.md
Abschnitt 9 vorgesehen). Die Anlage 1a/1b-Daten kommen direkt aus den
PZE-Timesheets und project_assignments.

---

## 6. Analyse Leistungsbestaetigung / Nachweis Eigenbeteiligung (Anlage 7.1a)

### 6.1 Bedeutung

Die Leistungsbestaetigung ist das **Pflichtdokument fuer den PT-Nachweis**
gemaess ZIM-Richtlinie 6.2.5 d). Sie wird der ZA beigelegt und dokumentiert,
dass alle Netzwerkpartner ihren Eigenanteil geleistet haben.

### 6.2 Formularstruktur

**Kopfdaten:**
- Datum der Erstellung
- Förderkennzeichen
- Kurzbezeichnung des Innovationsnetzwerkes
- Netzwerkmanagementeinrichtung (= Cubintec GmbH)
- Abrechnungszeitraum von / bis
- Gesamtkosten im Abrechnungszeitraum (netto) [EUR]
- Foerderquote (Dropdown: 90% / 70% / 50% / 40% / 30% / 20% / 10% / 5%)

**Tabelle Netzwerkpartner:**

| Name des Partners | Rechnungsnummer | Zahlungseingang | Eigenanteil (netto) EUR |
|---|---|---|---|

- Mehrere Zeilen je Partner moeglich (Korrekturen/Gutschriften als negative Betraege)
- Mehrere Rechnungsnummern je Zeile moeglich (kommagetrennt)
- Summe aller Eigenanteile am Ende

**Schlussblock:**
- Name Unterzeichner (Cubintec / Katrin Kirchner)
- Rechtsverbindliche Unterschrift
- PT-Pruefvermerk (nur VDI/VDE-IT): anerkannte Kosten, Ueber-/Unterdeckung

### 6.3 Wichtige Erkenntnisse aus dem Beispiel YachtConnect (Phase 1)

Das ausgefuellte Beispiel (Abrechnungszeitraum 01.05.2024 – 30.04.2025) zeigt:

1. **Abrechnungszeitraum ist flexibel** — nicht zwingend quartalsweise,
   hier ein ganzes Jahr (12 Monate)

2. **Korrekturrechnungen / Gutschriften** sind normale Praxis:
   - Jeder Partner erscheint zweimal: einmal mit positiver Zahlung (Erstrechnung),
     einmal mit negativem Betrag (Korrekturrechnung/Gutschrift)
   - Beispiel: Flensburger Yachtservice: +3.000,00 € (Rg. 240010) und -831,55 € (Rg. 25019)

3. **Mehrere Rechnungsnummern je Eintrag moeglich:**
   - Beispiel VoltMove GmbH: Rechnungsnummern 240024, 240031, 240046, 25003, 2502

4. **Foerderquote 90%** im Beispiel = Phase 1, nationales Netzwerk (korrekt)

5. **Summe der Eigenanteile: 19.866,20 €** bei Gesamtkosten 198.662,00 €
   = 10% Eigenanteil bei 90% Foerdersatz (korrekt)

---

## 7. Konsequenzen fuer das Datenmodell

### 7.1 Anpassungen v7_netzwerk_eigenanteile

| Feld | Bisheriges Modell | Angepasstes Modell |
|------|-------------------|-------------------|
| `rechnung_nr` | TEXT (eine Nummer) | TEXT (mehrere Nummern, kommagetrennt) |
| `betrag_ist` | NUMERIC >= 0 | NUMERIC (negativ fuer Gutschriften erlaubt) |
| `betrag_soll` | NUMERIC >= 0 | NUMERIC (negativ fuer Korrekturen erlaubt) |
| Abrechnungszeitraum | quartalsweise | flexibel (monatlich, quartalsweise, jaehrlich) |
| Gutschriften | nicht vorgesehen | eigene Zeile mit negativen Betraegen |
| UNIQUE constraint | (partner_id, periode_von, periode_bis) | **aufheben** — mehrere Zeilen je Partner/Periode erlaubt |

### 7.2 Neue Felder in v7_netzwerk_eigenanteile

```sql
ALTER TABLE v7_netzwerk_eigenanteile
  ADD COLUMN IF NOT EXISTS ist_korrektur BOOLEAN NOT NULL DEFAULT FALSE,
  -- TRUE = diese Zeile ist eine Korrektur/Gutschrift zu einer frueheren Abrechnung
  ADD COLUMN IF NOT EXISTS korrektur_zu_id UUID REFERENCES v7_netzwerk_eigenanteile(id);
  -- Verknuepfung zur urspruenglichen Zeile (optional, fuer Nachvollziehbarkeit)
```

### 7.3 Foerderquote im Leistungsnachweis

- Wird automatisch aus `foerdersatz_stufen` + Abrechnungszeitraum berechnet
- Muss manuell ueberschreibbar sein als Dropdown mit festen Werten
  gemaess ZIM-Richtlinie 2024:
  **95% / 90% / 80% / 70% / 60% / 50% / 40% / 30%**
  (95% = internationales Netzwerk Phase 1 Jahr 1/2/3;
   90% = nationales Netzwerk Phase 1;
   80%/60%/40% = internationales Netzwerk Phase 2 Jahr 1/2/3+4;
   70%/50%/30% = nationales Netzwerk Phase 2 Jahr 1/2/3+4)
- Neues Feld in v7_netzwerk_eigenanteile: `foerderquote_manuell BOOLEAN DEFAULT FALSE`
  (TRUE = manuell gesetzt, nicht automatisch ueberschreiben)

### 7.4 Leistungsnachweis als PDF

Der Leistungsnachweis (Anlage 7.1a) wird in PZE als **druckbares PDF** generiert
und entspricht exakt dem VDI/VDE-IT-Formular. Felder:

- Kopfdaten: automatisch aus Projektdaten
- Foerderquote: aus foerdersatz_stufen automatisch vorbelegt (ueberschreibbar)
  Dropdown-Werte gemaess ZIM-Richtlinie 2024 (keine freie Eingabe):
  95% / 90% / 80% / 70% / 60% / 50% / 40% / 30%
- Tabelle: aus v7_netzwerk_eigenanteile (alle Zeilen des Abrechnungszeitraums,
  inkl. Korrekturen mit negativen Betraegen)
- Summe: automatisch berechnet
- Unterzeichner: aus Projekteinstellungen konfigurierbar

---

## 8. Stundennachweis NWM

Das NWM-Stundennachweis-Formular (Excel) zeigt:

- Tagesbasierte Erfassung (Spalten 1-31 = Tage des Monats)
- Zeilen = Arbeitspakete, beschriftet als **"foerderbare Management-Arbeiten"**
  (bestaetigt die im Pflichtenheft bereits dokumentierte abweichende Bezeichnung
  gegenueber Standard-ZIM-Projekten: "foerderbare Projektarbeiten")
- Monatlich, je Netzwerkmanager einzeln
- Unterschrift Netzwerkmanager + Geschaeftsfuehrer/FuE-Verantwortlicher
- Verbleibt beim Zuwendungsempfaenger, nur auf Anforderung vorlegen

**Fazit:** Die bestehende PZE-Zeiterfassung (v7_timesheets) bildet alles
Erforderliche ab. Kein separates Erfassungsmodul noetig.
Die Stundennachweis-Matrix (StundennachweisMatrix-v7_4_4-1.tsx) muss fuer
ZIM_NETZWERK-Projekte die Bezeichnung "foerderbare Management-Arbeiten"
statt "foerderbare Projektarbeiten" verwenden.

---

## 9. Offene Punkte

| # | Thema | Klaerungsbedarf |
|---|-------|-----------------|
| 1 | Bewilligungsdatum YachtConnect Phase 2 | Ist 01.08.2025 korrekt? |
| 2 | `phase2_start_datum` Spalte droppen | Wann? Naechste grosse DB-Migration |
| 3 | Phase 1 YachtConnect | Wird nicht in PZE abgebildet (abgeschlossen) |
| 4 | UNIQUE constraint v7_netzwerk_eigenanteile | Aufheben vor erster Dateneingabe |
| 5 | Unterzeichner Leistungsnachweis | In NWM-Einstellungen konfigurierbar machen |
| 6 | Abrechnungszeitraum Leistungsnachweis | Flexibel (nicht nur quartalsweise) — UI anpassen |

---

## 10. Einordnung im Pflichtenheft

Ersetzt / ergaenzt Konzept KONZEPT-ZIM-NETZWERKMANAGEMENT-v1_2.md Abschnitte 1-2, 7.
Pflichtenheft-Update: v4.56, Abschnitt 6.7 NWM-Modul anpassen.
