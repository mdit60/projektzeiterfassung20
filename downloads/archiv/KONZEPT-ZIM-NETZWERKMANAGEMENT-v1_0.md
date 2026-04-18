# KONZEPT: ZIM-Netzwerkmanagement-Modul (NWM)
# Version 1.0
# Stand: 25. Maerz 2026
# Status: KONZEPT - Bereit zur Implementierung

---

## 1. Ueberblick und Zielsetzung

### 1.1 Kontext

Cubintec GmbH ist selbst als Netzwerkmanagementeinrichtung (NWM) fuer ZIM-Innovationsnetzwerke
taetig. Das NWM-Modul unterstuetzt Cubintec bei:

1. **Foerderabrechnung gegenueber dem Projekttraeger (PT):**
   Korrekte Anwendung der degressiv gestaffelten Foerdersaetze gemaess ZIM-Richtlinie 2024
   auf die eigenen NWM-Kosten. Integration in den bestehenden ZA-Workflow.

2. **Eigenanteil-Abrechnung gegenueber den Netzwerkpartnern (NP):**
   Berechnung und Dokumentation der monatlichen Eigenbeteiligung jedes NP auf Basis
   der tatsaechlichen foerderfaehigen Stunden aus der PZE-Zeiterfassung. Erstellung
   der Rechnungsunterlagen (Cubintec -> NP) und des PT-Nachweises.

### 1.2 Rechtliche Grundlage

ZIM-Foerderrichtlinie vom 28. November 2024, Abschnitt 5.2.2 und 6.2.5:

- Foerderung des NWM ist degressiv gestaffelt (national und international)
- Eigenanteil = Gesamtkosten NWM x (100% - Foerdersatz des aktuellen Laufzeitjahres)
- Eigenbeteiligungen der NP sind Voraussetzung fuer weitere Auszahlung von Foerdermitteln
- Zahlung der Eigenbeteiligungen gilt als Bestaetigung erbrachter Managementleistungen

### 1.3 Abgrenzung

Dieses Modul gilt AUSSCHLIESSLICH fuer Projekte mit `funding_format = 'ZIM_NETZWERK'`
im Berater-Portal (Cubintec-eigene Netzwerke). Es ist NICHT fuer Kundenprojekte gedacht,
kann aber optional fuer Kunden-NWM aktiviert werden.

---

## 2. Foerdersaetze und Eigenanteile laut ZIM-Richtlinie 2024

### 2.1 Nationale Innovationsnetzwerke

| Phase | Laufzeitjahr | Foerdersatz NWM | Eigenanteilsquote |
|-------|-------------|-----------------|-------------------|
| Phase 1 | Jahr 1 (max. 12 Mon.) | 90 % | 10 % |
| Phase 1 | Jahr 2 (falls benoetigt) | 90 % | 10 % |
| Phase 2 | Jahr 1 | 70 % | 30 % |
| Phase 2 | Jahr 2 | 50 % | 50 % |
| Phase 2 | Jahr 3 (Ausnahmefall) | 30 % | 70 % |
| Phase 2 | Jahr 4 (Ausnahmefall) | 30 % | 70 % |

Maximale Foerderbetraege: Phase 1 max. 210.000 EUR, Gesamt max. 490.000 EUR.

### 2.2 Internationale Innovationsnetzwerke

| Phase | Laufzeitjahr | Foerdersatz NWM | Eigenanteilsquote |
|-------|-------------|-----------------|-------------------|
| Phase 1 | Jahr 1 (max. 18 Mon.) | 95 % | 5 % |
| Phase 1 | Jahr 2 | 95 % | 5 % |
| Phase 1 | Jahr 3 (falls benoetigt) | 95 % | 5 % |
| Phase 2 | Jahr 1 | 80 % | 20 % |
| Phase 2 | Jahr 2 | 60 % | 40 % |
| Phase 2 | Jahr 3 | 40 % | 60 % |
| Phase 2 | Jahr 4 (Ausnahmefall) | 40 % | 60 % |

Maximale Foerderbetraege: Phase 1 max. 260.000 EUR, Gesamt max. 600.000 EUR.

### 2.3 Laufzeitjahr-Berechnung

Das Laufzeitjahr ergibt sich aus dem Bewilligungsdatum (nicht Kalenderjahr):

```
Laufzeitjahr = CEIL((ZA_zeitraum_bis - bewilligung_datum) / 365.25)
```

Beispiel: Bewilligung 01.04.2025, ZA-Periode bis 30.09.2026 = Laufzeitjahr 2.

---

## 3. Kostenermittlung NWM

### 3.1 Grundprinzip

Die NWM-Kosten eines Quartals werden direkt aus den foerderfaehigen Stunden der
PZE-Zeiterfassung berechnet. Nur Stunden, die gemaess Zuwendungsbescheid als
foerderfaehig anerkannt wurden, fliessen ein.

```
NWM-Kosten Quartal = SUMME(Stunden_MA_i x Stundensatz_bewilligt_MA_i)
                     fuer alle MA im Projekt im Abrechnungszeitraum
```

Der `hourly_rate_approved` aus `v7_project_assignments` wird verwendet
(bewilligter Stundensatz VDI/VDE, nicht der kalkulatorische Stundensatz).

### 3.2 Kostenkomponenten

Gemaess ZIM-Richtlinie 5.3.1:

| Komponente | Herkunft in PZE | Bemerkung |
|-----------|----------------|-----------|
| Personalkosten | Timesheets x hourly_rate_approved | Hauptposition |
| Auftraege Dritte | Manuell in ZA-Formular | max. 25% Gesamtkosten (nat.) |
| Uebrige Kosten | Pauschal 100% der Personalkosten | Gemaeass Richtlinie abgegolten |

Fuer die Eigenanteil-Berechnung gilt: **Eigenanteil bezieht sich auf die Gesamtkosten**
(Personal + Dritte + Uebrige), nicht nur auf Personalkosten.

---

## 4. Eigenanteil-Modul

### 4.1 Konzept

Der Eigenanteil pro Quartal wird aufgeteilt auf die aktiven Netzwerkpartner.
Die Aufteilung erfolgt nach individuell vereinbarten Quoten (nicht zwingend gleich).
Die Quoten werden einmalig bei Netzwerkgruendung festgelegt und koennen bei
Partnerwechsel angepasst werden.

### 4.2 Berechnungsformel

```
Eigenanteil_gesamt_Quartal = NWM_Kosten_Quartal x Eigenanteilsquote(Laufzeitjahr)

Eigenanteil_NP_i_Quartal   = Eigenanteil_gesamt_Quartal x Quote_NP_i
                             (wobei SUMME(Quote_NP_i) = 100%)
```

### 4.3 Dynamische NP-Anzahl

Scheidet ein NP aus, werden die Quoten der verbleibenden NP proportional
hochgerechnet ODER manuell neu verteilt. PZE bietet beide Optionen:

- **Auto-Neuverteilung:** Quoten der verbleibenden NP werden proportional
  hochskaliert (Summe bleibt 100%)
- **Manuelle Neufestsetzung:** Berater traegt neue Quoten manuell ein

### 4.4 Beispielrechnung

Annahmen: National, Phase 2 Jahr 1, 8 NP, NWM-Kosten Q1 = 24.000 EUR

```
Foerdersatz:             70 %
Foerderbetrag PT:        16.800 EUR
Eigenanteil gesamt:       7.200 EUR (30%)

NP-Quoten (Beispiel):
  TechCorp GmbH:         20% ->  1.440 EUR
  InnoTech GmbH:         20% ->  1.440 EUR
  StartupA GmbH:         15% ->  1.080 EUR
  StartupB GmbH:         15% ->  1.080 EUR
  Mittelstand1 GmbH:     10% ->    720 EUR
  Mittelstand2 GmbH:     10% ->    720 EUR
  KleinbetriebA GmbH:     5% ->    360 EUR
  KleinbetriebB GmbH:     5% ->    360 EUR
                        ---     --------
  SUMME:               100% ->  7.200 EUR
```

---

## 5. Datenbankmodell

### 5.1 Erweiterung v7_projects

```sql
ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS netzwerk_typ        TEXT,        -- 'national' | 'international'
  ADD COLUMN IF NOT EXISTS netzwerk_phase      TEXT,        -- 'phase1' | 'phase2'
  ADD COLUMN IF NOT EXISTS bewilligung_datum   DATE,        -- Datum Zuwendungsbescheid Phase 1
  ADD COLUMN IF NOT EXISTS phase2_start_datum  DATE,        -- Datum Bewilligung Phase 2
  ADD COLUMN IF NOT EXISTS foerdersatz_stufen  JSONB;       -- Automatisch berechnet, kann ueberschrieben werden
```

`foerdersatz_stufen` JSONB-Struktur:
```json
[
  {"laufzeitjahr": 1, "satz_percent": 70, "gueltig_ab": "2025-04-01"},
  {"laufzeitjahr": 2, "satz_percent": 50, "gueltig_ab": "2026-04-01"},
  {"laufzeitjahr": 3, "satz_percent": 30, "gueltig_ab": "2027-04-01"}
]
```

Die Stufen werden beim Speichern des Bewilligungsdatums automatisch
berechnet und ins JSONB geschrieben. Manuelles Ueberschreiben ist moeglich.

### 5.2 Neue Tabelle v7_netzwerk_partner

```sql
CREATE TABLE IF NOT EXISTS v7_netzwerk_partner (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,                    -- Firmenname NP
  rechtsform            TEXT,                             -- GmbH, GbR, AG, etc.
  ansprechpartner       TEXT,                             -- Name Kontaktperson
  email                 TEXT,                             -- fuer Rechnungsversand
  eigenanteil_quote     NUMERIC(5,2) NOT NULL DEFAULT 0, -- Prozentualer Anteil 0-100
  beitritt_datum        DATE NOT NULL,                    -- Ab wann eigenanteilspflichtig
  austritt_datum        DATE,                             -- NULL = aktiv
  notizen               TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT nwp_quote_range CHECK (eigenanteil_quote >= 0 AND eigenanteil_quote <= 100)
);

CREATE INDEX IF NOT EXISTS idx_v7_netzwerk_partner_project
  ON v7_netzwerk_partner(project_id);
```

**Validierungsregel:** Die Summe aller `eigenanteil_quote` aktiver NP eines Projekts
muss 100.00 ergeben. Wird per Trigger oder Application-seitig geprueft.

### 5.3 Neue Tabelle v7_netzwerk_eigenanteile

```sql
CREATE TABLE IF NOT EXISTS v7_netzwerk_eigenanteile (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,
  partner_id            UUID NOT NULL REFERENCES v7_netzwerk_partner(id) ON DELETE CASCADE,
  za_id                 UUID REFERENCES v7_zahlungsanforderungen(id),  -- zugehoerige ZA
  periode_von           DATE NOT NULL,
  periode_bis           DATE NOT NULL,

  -- Berechnungsbasis (Snapshot zum Zeitpunkt der Erstellung)
  nwm_kosten_gesamt     NUMERIC(14,2) NOT NULL, -- Gesamtkosten NWM im Quartal
  foerdersatz_percent   NUMERIC(5,2)  NOT NULL, -- Angewandter Foerdersatz
  eigenanteil_gesamt    NUMERIC(14,2) NOT NULL, -- Eigenanteil gesamt
  eigenanteil_quote     NUMERIC(5,2)  NOT NULL, -- Quote des NP zum Berechnungszeitpunkt
  betrag_soll           NUMERIC(14,2) NOT NULL, -- = eigenanteil_gesamt x quote / 100

  -- Zahlungsstatus
  betrag_ist            NUMERIC(14,2),           -- Tatsaechlich eingegangen
  eingegangen_am        DATE,                    -- Datum Zahlungseingang
  rechnung_nr           TEXT,                    -- Rechnungsnummer Cubintec -> NP
  rechnung_datum        DATE,
  status                TEXT NOT NULL DEFAULT 'offen', -- offen | bezahlt | gemahnt | storniert

  notizen               TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT v7_nwm_ea_unique UNIQUE (partner_id, periode_von, periode_bis)
);

CREATE INDEX IF NOT EXISTS idx_v7_netzwerk_ea_project
  ON v7_netzwerk_eigenanteile(project_id);
CREATE INDEX IF NOT EXISTS idx_v7_netzwerk_ea_partner
  ON v7_netzwerk_eigenanteile(partner_id);
CREATE INDEX IF NOT EXISTS idx_v7_netzwerk_ea_za
  ON v7_netzwerk_eigenanteile(za_id);
```

---

## 6. UI-Konzept im Berater-Portal

### 6.1 Einbindung

Das NWM-Modul erscheint als zusaetzlicher Tab in der Projektdetailseite,
**ausschliesslich sichtbar wenn** `funding_format = 'ZIM_NETZWERK'`.

```
[Uebersicht] [Arbeitsplan] [Team] [Zeiterfassung] [ZA] [Netzwerk] <-- NEU
```

### 6.2 NWM-Tab: Unterstruktur

```
[Netzwerk]
  |- [Netzwerkpartner]     -- NP verwalten, Quoten pflegen
  |- [Eigenanteile]        -- Berechnung und Zahlungsstatus
  |- [Einstellungen]       -- Foerdersatz-Stufen, Bewilligungsdaten
```

### 6.3 Tab "Netzwerkpartner"

Tabelle aller NP mit:
- Name, Rechtsform, Ansprechpartner, E-Mail
- Eigenanteil-Quote in %
- Status (aktiv/ausgeschieden) + Datum
- Summenzeile: Quoten-Summe (muss 100,00% ergeben, sonst Warnung in Rot)

Aktionen:
- NP hinzufuegen / bearbeiten / als ausgeschieden markieren
- Bei Austritt: Dialog "Quote neu verteilen" (auto-proportional oder manuell)

### 6.4 Tab "Eigenanteile"

#### Oberer Bereich: Quartal-Uebersicht

Dropdown: Quartal auswaehlen (Vorschlag: aktuelles ZA-Quartal)

Anzeige-Kacheln:
- NWM-Kosten Quartal (aus ZE berechnet)
- Foerdersatz (aus Stufen automatisch ermittelt)
- Foerderbetrag PT
- Eigenanteil gesamt
- Eigenanteil bereits eingegangen (Summe bezahlt)
- Eigenanteil noch offen

#### Mittlerer Bereich: NP-Tabelle

| NP | Quote | Betrag Soll | Rechnung Nr. | Eingegangen | Status |
|----|-------|-------------|-------------|-------------|--------|
| TechCorp GmbH | 20% | 1.440 EUR | R-2025-001 | 15.04.2025 | bezahlt |
| InnoTech GmbH | 20% | 1.440 EUR | R-2025-002 | - | offen |

Aktionen je Zeile:
- "Zahlungseingang erfassen" (Datum + Betrag)
- "Mahnung senden" (Status -> gemahnt)
- "Rechnung anzeigen/PDF"

#### Unterer Bereich: Aktions-Buttons

- **[Eigenanteile berechnen]** -- Berechnet alle Betraege fuer das Quartal neu
  (setzt vorhandene "offen"-Eintraege zurueck, behaelt "bezahlt")
- **[Rechnungen erstellen]** -- Erzeugt fuer alle NP mit Status "offen" eine PDF-Rechnung
- **[PT-Nachweis erstellen]** -- Erstellt Eingangs-Uebersicht fuer ZA-Einreichung

### 6.5 Tab "Einstellungen"

- Netzwerk-Typ: national / international (Dropdown)
- Netzwerk-Phase: Phase 1 / Phase 2 (Dropdown)
- Bewilligungsdatum Phase 1 (Date-Picker)
- Bewilligungsdatum Phase 2 (Date-Picker, optional)
- Tabelle der Foerdersatz-Stufen (automatisch berechnet, manuell ueberschreibbar)

---

## 7. Dokumente und Ausgaben

### 7.1 Rechnung Cubintec -> Netzwerkpartner

**Format:** PDF (via window.print(), A4 Hochformat)

**Inhalt:**
```
RECHNUNG

Von:  Cubintec GmbH, Rederstrasse 24, 97616 Bad Neustadt a.d. Saale
An:   [NP-Name, Adresse aus v7_netzwerk_partner]

Rechnungsnummer:  [rechnung_nr]
Rechnungsdatum:   [rechnung_datum]
Faelligkeitsdatum: [rechnung_datum + 14 Tage]

Betreff: Eigenbeteiligung Netzwerkmanagement [Netzwerkname]
         Abrechnungszeitraum [periode_von] bis [periode_bis]

Position:
  Netzwerkmanagement-Eigenanteil gemaess Netzwerkvereinbarung
  Zeitraum:          [Q1/Q2/Q3/Q4 JJJJ]
  NWM-Gesamtkosten:  [nwm_kosten_gesamt] EUR
  Foerdersatz:       [foerdersatz_percent] %
  Eigenanteil gesamt:[eigenanteil_gesamt] EUR
  Ihr Anteil:        [eigenanteil_quote] %
  -----------------------------------------
  Rechnungsbetrag:   [betrag_soll] EUR

  zzgl. USt. [0% / 19%] = [USt-Betrag] EUR    <- konfigurierbar
  -----------------------------------------
  Gesamtbetrag:      [betrag_soll + USt] EUR

Bankverbindung:  [Cubintec-Bankdaten aus Firmendaten]
Verwendungszweck: [rechnung_nr] [NP-Name kurz]

Foerderprojekt: [funding_reference] | [project_name]
Projekttraeger: VDI/VDE-IT GmbH | ZIM-Foerderrichtlinie 2024
```

**Hinweis USt:** Konfigurierbar pro Projekt (0% fuer gemeinnuetzige NP moeglich).
Standardwert: 19%.

### 7.2 PT-Nachweis: Eingangs-Uebersicht Eigenbeteiligungen

**Format:** PDF (window.print(), A4 Hochformat)

**Zweck:** Pflichtnachweis fuer jede ZA-Einreichung gemaess ZIM-Richtlinie 6.2.5 d)

**Inhalt:**
```
NACHWEIS EIGENBETEILIGUNGEN NETZWERKPARTNER

Netzwerk:           [Projektname]
Foerderzeichen:     [funding_reference]
Abrechnungszeitraum:[periode_von] bis [periode_bis]
Erstellt am:        [Datum]
Erstellt von:       Cubintec GmbH

Foerderparameter:
  Netzwerktyp:      national / international
  Netzwerkphase:    Phase 1 / Phase 2, Laufzeitjahr X
  Foerdersatz:      XX %
  Eigenanteilsquote:XX %

Tabelle Netzwerkpartner:
  NP | Vereinbarter Anteil | Soll-Betrag | Eingegangen am | Ist-Betrag | Status

Summen:
  Gesamter Eigenanteil Soll:  XXXX EUR
  Davon eingegangen:          XXXX EUR
  Noch ausstehend:            XXXX EUR

Bestaetigung:
  Mit Einreichung dieser Zahlungsanforderung bestaetigt die
  Netzwerkmanagementeinrichtung, dass die in der Tabelle
  aufgefuehrten Eigenbeteiligungen der Netzwerkpartner fuer den
  genannten Abrechnungszeitraum eingegangen sind (soweit als
  "bezahlt" markiert).

  ____________________    ____________________
  Ort, Datum              Unterschrift NWM
```

---

## 8. Verknuepfung mit dem ZA-Workflow

### 8.1 Integration

Wenn eine ZA fuer ein ZIM_NETZWERK-Projekt erstellt wird:

1. **Foerdersatz automatisch:** ZAPanel liest `foerdersatz_stufen` und setzt
   `foerdersatz_percent` der ZA automatisch auf den korrekten Satz fuer das
   aktuelle Laufzeitjahr.

2. **Eigenanteile-Check:** Beim Wechsel ZA-Status -> "Eingereicht" prueft PZE,
   ob alle NP-Eigenanteile des Zeitraums den Status "bezahlt" haben.
   Falls nicht: Warnung (kein Blocker, da NP ggf. spaeter zahlen).

3. **PT-Nachweis:** Im ZAPanel erscheint fuer ZIM_NETZWERK-Projekte ein
   zusaetzlicher Button "PT-Nachweis Eigenanteile" der direkt den Nachweis
   fuer den ZA-Zeitraum erzeugt.

### 8.2 ZA-Daten fuer NWM

Zusaetzliche Felder in `v7_zahlungsanforderungen` fuer ZIM_NETZWERK:

```sql
ALTER TABLE v7_zahlungsanforderungen
  ADD COLUMN IF NOT EXISTS nwm_personalkosten    NUMERIC(14,2), -- aus ZE berechnet
  ADD COLUMN IF NOT EXISTS nwm_kosten_dritte     NUMERIC(14,2), -- manuell
  ADD COLUMN IF NOT EXISTS nwm_kosten_uebrige    NUMERIC(14,2), -- = 100% Personalkosten
  ADD COLUMN IF NOT EXISTS nwm_kosten_gesamt     NUMERIC(14,2), -- Summe
  ADD COLUMN IF NOT EXISTS laufzeitjahr          INTEGER;       -- fuer Foerdersatz
```

---

## 9. Implementierungsreihenfolge

### Schritt 1: Datenbankmigrationen (1 SQL-Datei)
- Erweiterung v7_projects (netzwerk_typ, netzwerk_phase, bewilligung_datum,
  phase2_start_datum, foerdersatz_stufen)
- Neue Tabelle v7_netzwerk_partner
- Neue Tabelle v7_netzwerk_eigenanteile
- Erweiterung v7_zahlungsanforderungen (NWM-Kostenfelder)

### Schritt 2: ZA-Integration (Anpassung ZAPanel)
- Foerdersatz automatisch aus foerdersatz_stufen lesen
- Laufzeitjahr berechnen und anzeigen
- NWM-Kostenfelder in ZA-Formular anzeigen (nur ZIM_NETZWERK)
- PT-Nachweis-Button

### Schritt 3: NWM-Tab in Projektdetailseite
- Neuer Tab "Netzwerk" (nur ZIM_NETZWERK)
- Unterstruktur: Einstellungen, Netzwerkpartner, Eigenanteile

### Schritt 4: Dokumente
- PDF Rechnung Cubintec -> NP
- PDF PT-Nachweis Eigenbeteiligungen

---

## 10. Offene Punkte und Entscheidungen

| # | Thema | Entscheidung erforderlich |
|---|-------|--------------------------|
| 1 | USt auf NP-Rechnungen | Standard 19%? Konfigurierbar pro Projekt? |
| 2 | Rechnungsnummernkreis | Format? Automatisch hochzaehlen? |
| 3 | Bankdaten Cubintec | Wo gepflegt? In Firmendaten-Stamm? |
| 4 | NP-Adressen | Reicht Name + E-Mail oder vollstaendige Adresse noetig? |
| 5 | Mahnsystem | Einfach Status "gemahnt" oder automatische Mahnung per E-Mail? |
| 6 | Mehrere Netzwerke | Kann Cubintec mehrere ZIM_NETZWERK-Projekte gleichzeitig haben? (Ja, normaler Fall) |

---

## 11. Einordnung im Pflichtenheft

Dieser Abschnitt ersetzt / ergaenzt Pflichtenheft Abschnitt 6.6
"Gestaffelte Foerderquoten ZIM-Netzwerk (offen)".

Das Modul wird als neuer Abschnitt 6.7 "NWM-Eigenanteil-Modul" ins
Pflichtenheft aufgenommen.

Betroffene Dateien bei Implementierung:
- migration_nwm_modul_v7_4_5.sql (NEU)
- ZAPanel-v7_4_4-XX.tsx (Erweiterung)
- ProjectDetailPage-v7_4_4-XX.tsx (neuer Tab)
- NWMTab-v7_4_5-1.tsx (NEU - Hauptkomponente)
- NWMPartnerPanel-v7_4_5-1.tsx (NEU)
- NWMEigenanteilPanel-v7_4_5-1.tsx (NEU)
- NWMDokumente-v7_4_5-1.tsx (NEU - PDF-Ausgaben)
