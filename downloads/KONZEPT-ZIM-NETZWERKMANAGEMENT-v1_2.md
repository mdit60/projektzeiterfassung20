# KONZEPT: ZIM-Netzwerkmanagement-Modul (NWM)
# Version 1.2
# Stand: 26. Maerz 2026
# Aenderungen gg. v1.1:
#   - Abschnitt 5: USt-Berechnungsbasis korrigiert (Option B: USt auf Gesamtleistung)
#   - Abschnitt 5: Vollstaendiges Rechenbeispiel mit Gegenueberstellung Option A / B
#   - Abschnitt 7: Rechnungsaufbau an Option-B-Logik angepasst
#   - Kennzeichnung "Zur Abstimmung mit Katrin" bei USt-Abschnitt
# Aenderungen gg. v1.0:
#   - Abschnitt 4: Quoten-Logik mit Gleichverteilung und Smart-Anpassung
#   - Abschnitt 5: USt-Behandlung vollstaendig neu
# Status: KONZEPT - USt-Behandlung zur Abstimmung mit Katrin

---

## 1. Ueberblick und Zielsetzung

### 1.1 Kontext

Cubintec GmbH ist selbst als Netzwerkmanagementeinrichtung (NWM) fuer ZIM-Innovationsnetzwerke
taetig. Das NWM-Modul unterstuetzt Cubintec bei:

1. Foerderabrechnung gegenueber dem Projekttraeger (PT):
   Korrekte Anwendung der degressiv gestaffelten Foerdersaetze gemaess ZIM-Richtlinie 2024
   auf die eigenen NWM-Kosten. Integration in den bestehenden ZA-Workflow.

2. Eigenanteil-Abrechnung gegenueber den Netzwerkpartnern (NP):
   Berechnung und Dokumentation der quartalsmassigen Eigenbeteiligung jedes NP auf Basis
   der tatsaechlichen foerderfaehigen Stunden aus der PZE-Zeiterfassung. Erstellung
   der Rechnungsunterlagen (Cubintec -> NP) inkl. korrekter USt-Behandlung
   und des PT-Nachweises.

### 1.2 Rechtliche Grundlage

ZIM-Foerderrichtlinie vom 28. November 2024, Abschnitt 5.2.2 und 6.2.5:

- Foerderung des NWM ist degressiv gestaffelt (national und international)
- Eigenanteil = Gesamtkosten NWM x (100% - Foerdersatz des aktuellen Laufzeitjahres)
- Eigenbeteiligungen der NP sind Voraussetzung fuer weitere Auszahlung von Foerdermitteln
- Zahlung der Eigenbeteiligungen gilt als Bestaetigung erbrachter Managementleistungen

### 1.3 Abgrenzung

Dieses Modul gilt ausschliesslich fuer Projekte mit `funding_format = 'ZIM_NETZWERK'`
im Berater-Portal (Cubintec-eigene Netzwerke). Kann optional auch fuer Kunden-NWM
aktiviert werden.

---

## 2. Foerdersaetze und Eigenanteile laut ZIM-Richtlinie 2024

### 2.1 Nationale Innovationsnetzwerke

| Phase    | Laufzeitjahr            | Foerdersatz NWM | Eigenanteilsquote |
|----------|-------------------------|-----------------|-------------------|
| Phase 1  | Jahr 1 (max. 12 Mon.)   | 90 %            | 10 %              |
| Phase 1  | Jahr 2 (falls benoetigt)| 90 %            | 10 %              |
| Phase 2  | Jahr 1                  | 70 %            | 30 %              |
| Phase 2  | Jahr 2                  | 50 %            | 50 %              |
| Phase 2  | Jahr 3 (Ausnahmefall)   | 30 %            | 70 %              |
| Phase 2  | Jahr 4 (Ausnahmefall)   | 30 %            | 70 %              |

Maximale Foerderbetraege: Phase 1 max. 210.000 EUR, Gesamt max. 490.000 EUR.

### 2.2 Internationale Innovationsnetzwerke

| Phase    | Laufzeitjahr              | Foerdersatz NWM | Eigenanteilsquote |
|----------|---------------------------|-----------------|-------------------|
| Phase 1  | Jahr 1 (max. 18 Mon.)     | 95 %            | 5 %               |
| Phase 1  | Jahr 2                    | 95 %            | 5 %               |
| Phase 1  | Jahr 3 (falls benoetigt)  | 95 %            | 5 %               |
| Phase 2  | Jahr 1                    | 80 %            | 20 %              |
| Phase 2  | Jahr 2                    | 60 %            | 40 %              |
| Phase 2  | Jahr 3                    | 40 %            | 60 %              |
| Phase 2  | Jahr 4 (Ausnahmefall)     | 40 %            | 60 %              |

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
NWM-Kosten Quartal (netto) = SUMME(Stunden_MA_i x Stundensatz_bewilligt_MA_i)
                              + Auftraege_Dritte (manuell)
                              + Uebrige_Kosten (= 100% der Personalkosten)
```

Der `hourly_rate_approved` aus `v7_project_assignments` wird verwendet
(bewilligter Stundensatz VDI/VDE, nicht der kalkulatorische Stundensatz).

### 3.2 Kostenkomponenten

Gemaess ZIM-Richtlinie 5.3.1:

| Komponente        | Herkunft in PZE               | Bemerkung                          |
|-------------------|-------------------------------|------------------------------------|
| Personalkosten    | Timesheets x hourly_rate_appr.| Hauptposition                      |
| Auftraege Dritte  | Manuell in ZA-Formular        | max. 25% Gesamtkosten (national)   |
| Uebrige Kosten    | Pauschal 100% der Personalkosten | Gemaess Richtlinie abgegolten   |

---

## 4. NP-Quoten: Gleichverteilung und Smart-Anpassung (NEU v1.1)

### 4.1 Grundprinzip

Die Eigenbeteiligung wird auf die aktiven NP nach individuell vereinbarten Quoten
aufgeteilt. Die Quoten muessen in Summe exakt 100,00 % ergeben.

### 4.2 Initialisierung: Gleichverteilung als Standard

Beim Hinzufuegen eines neuen NP oder beim Erstanlegen des Netzwerks setzt
PZE automatisch die Gleichverteilung als Startwert:

```
Quote_je_NP = 100 / Anzahl_aktiver_NP
```

Beispiele:
- 6 NP: je 16,67 %  (Summe = 100,00 % durch Rundungskorrektur beim letzten NP)
- 8 NP: je 12,50 %
- 7 NP: je 14,29 % (letzter NP erhaelt 14,27 % um auf exakt 100,00 zu kommen)

Rundungskorrektur: Der letzte NP in der Liste erhaelt den Restbetrag
(100,00 - Summe der anderen gerundeten Werte), so dass die Summe immer
exakt 100,00 % ergibt.

### 4.3 Smart-Anpassung beim manuellen Editieren

Wenn der Berater die Quote eines NP manuell aendert, passt PZE die Quoten
der NICHT-manuell-bearbeiteten NP automatisch proportional an:

Algorithmus:
1. Berater aendert Quote von NP_x auf neuen Wert Q_neu.
2. Differenz = Q_neu - Q_alt_x
3. Verbleibende Anpassungsmasse = -Differenz (muss auf andere NP verteilt werden)
4. Alle NP ausser NP_x, die NICHT als "manuell gesperrt" markiert sind,
   erhalten ihre Quote proportional angepasst:
   Q_i_neu = Q_i_alt - (Q_i_alt / Summe_freie_Quoten) x Differenz
5. NP_x wird als "manuell gesperrt" markiert (visuell: Schloss-Icon).
6. Summen-Check: Wenn Summe != 100,00 -> Rundungskorrektur auf den letzten
   freien NP anwenden.

Beispiel mit 4 NP (je 25%), Berater setzt NP1 auf 40%:
- NP1: 40% (gesperrt)
- NP2, NP3, NP4: jeder verliert proportional: (15% / 3) = 5%
  -> je 20%
- Summe: 40 + 20 + 20 + 20 = 100%

### 4.4 Manuelle Sperrung und Entsperrung

- Jeder NP hat ein Schloss-Icon neben seiner Quote.
- Gesperrte NP werden bei Auto-Anpassung uebersprungen.
- Berater kann einzelne NP manuell sperren/entsperren.
- Button "Alle entsperren" setzt alle Sperren zurueck.
- Button "Gleichverteilen" setzt alle Quoten auf Gleichverteilung (loescht alle Sperren).

### 4.5 NP-Austritt: Quote neu verteilen

Scheidet ein NP aus dem Netzwerk aus (Austritts-Datum gesetzt):

Dialog "NP ausscheiden":
  Option A (Standard): Quote von [NP-Name] (XX%) proportional auf verbleibende NP verteilen
  Option B:            Quoten manuell neu festlegen

Bei Option A: Quoten der verbleibenden NP werden proportional hochskaliert,
so dass die Summe wieder 100,00 % ergibt.

### 4.6 Validierungsregel

Solange Summe der aktiven NP-Quoten != 100,00 %, zeigt PZE:
- Rote Summenzeile mit Hinweis "Quoten muessen 100,00% ergeben"
- Button "Eigenanteile berechnen" ist deaktiviert
- Speichern ist trotzdem moeglich (Zwischenspeicherung erlaubt)

---

## 5. Umsatzsteuer-Behandlung (v1.2 -- ZUR ABSTIMMUNG MIT KATRIN)

### 5.1 Steuerrechtliche Einordnung

Die ZIM-Foerderung ist ein nicht steuerbarer Zuschuss der oeffentlichen Hand.
Der PT zahlt den Foerderbetrag an Cubintec -- dieser Geldfluss unterliegt
NICHT der Umsatzsteuer (kein Leistungsaustausch zwischen Cubintec und PT).

Die Netzwerkmanagement-Leistung von Cubintec gegenueber den Netzwerkpartnern
ist dagegen eine umsatzsteuerpflichtige Dienstleistung (Paragraphen 1 und 3a UStG).
Cubintec erbringt das vollstaendige Netzwerkmanagement fuer alle NP -- diese
Gesamtleistung ist die umsatzsteuerpflichtige Basis, nicht nur der Eigenanteil.

### 5.2 Berechnungsmethode: USt auf Gesamtleistung (Option B)

HINWEIS: Diese Berechnungsmethode ist mit Katrin abzustimmen.
         Zwei Optionen wurden diskutiert -- Option B wird empfohlen.

OPTION A (nicht empfohlen): USt nur auf Eigenanteil
  -> USt-Basis = Eigenanteil netto (nach Abzug Foerderung)
  -> Ergebnis: Niedrigere USt-Last fuer NP, aber steuerrechtlich
     fragwuerdig, da die Gesamtleistung die Bemessungsgrundlage ist.

OPTION B (empfohlen): USt auf Gesamtleistung, anteilig pro NP
  -> USt-Basis = NWM-Gesamtkosten netto (volle Managementleistung)
  -> Jeder NP zahlt seinen Anteil an der Gesamt-USt
  -> Ergebnis: Fuer vorsteuerabzugsberechtigte NP kein Unterschied
     (holen USt als Vorsteuer zurueck). Nur fuer steuerbefreite NP
     hoehere Belastung -- diese muessen separat gehandhabt werden.

Rechenweg Option B fuer ein Quartal (wird in PZE implementiert):

```
Schritt 1: Gesamtleistung und Foerderung
  NWM-Gesamtkosten netto:    24.000 EUR
  USt 19% auf Gesamtleistung: 4.560 EUR
  Gesamtrechnung brutto:     28.560 EUR

  Foerdersatz:                   70%  (Phase 2, Jahr 1, national)
  Foerderbetrag PT (netto):   16.800 EUR  (zahlbar vom PT an Cubintec, ohne USt)

Schritt 2: Je NP (Beispiel: Quote 12,5%, 8 NP)
  Anteil Gesamtleistung netto:  3.000 EUR  (24.000 x 12,5%)
  ./. Anteil Foerderung PT:    -2.100 EUR  (16.800 x 12,5%)
  = Eigenanteil netto:            900 EUR

  Anteil USt (19% auf 3.000):     570 EUR  (4.560 x 12,5%)
  -----------------------------------------------
  Zahlung NP an Cubintec:       1.470 EUR  (Eigenanteil netto + Anteil USt)

Schritt 3: Cubintec-Cashflow
  Einnahmen von PT:            16.800 EUR  (Foerderbetrag, keine USt)
  Einnahmen von 8 NP netto:     7.200 EUR  (8 x 900 EUR)
  Einnahmen USt von 8 NP:       4.560 EUR  (8 x 570 EUR)
  -------------------------------------------
  Gesamt-Einnahmen:            28.560 EUR
  ./. NWM-Kosten netto:       -24.000 EUR
  ./. USt-Abfuhr Finanzamt:    -4.560 EUR
  -------------------------------------------
  Ergebnis:                         0 EUR  (kostendeckend)
```

### 5.3 Gegenueberstellung Option A vs. Option B

Annahmen: NWM-Kosten 24.000 EUR netto, Foerdersatz 70%, NP-Quote 12,5%

```
                              Option A          Option B
                         (USt auf EA-netto)  (USt auf Gesamt)
  Eigenanteil netto:           900 EUR           900 EUR
  USt-Basis:                   900 EUR         3.000 EUR
  USt 19%:                     171 EUR           570 EUR
  Zahlung NP brutto:         1.071 EUR         1.470 EUR
  Differenz je NP:                          +   399 EUR
```

Fuer vorsteuerabzugsberechtigte NP: Die 570 EUR USt werden als Vorsteuer
zurueckerstattet -- effektive Belastung identisch mit Option A (900 EUR netto).

Fuer NICHT vorsteuerabzugsberechtigte NP (z.B. gemeinnuetzige Vereine):
Option B bedeutet eine echte Mehrbelastung von 399 EUR je Quartal.
Empfehlung: Diese NP mit USt-Satz 0% konfigurieren und separat
vertraglich regeln (Katrin klaeren ob und wie moeglich).

### 5.4 Vollstaendiges Rechenbeispiel (Option B, 8 NP, alle 19% USt)

Annahmen: National, Phase 2 Jahr 1, NWM-Kosten Q1 = 24.000 EUR netto

```
NWM-Gesamtleistung netto:    24.000 EUR
USt 19%:                      4.560 EUR
Gesamtleistung brutto:       28.560 EUR

Foerderbetrag PT (netto):    16.800 EUR  (zahlt PT an Cubintec)
Eigenanteil gesamt netto:     7.200 EUR  (zahlen NP an Cubintec)
Eigenanteil gesamt USt:       4.560 EUR  (zahlen NP an Cubintec)

Je NP (Quote 12,5%):
  Anteil Gesamtleistung netto: 3.000 EUR
  ./. Foerderanteil PT:       -2.100 EUR
  = Eigenanteil netto:           900 EUR
  + USt-Anteil (19% v. 3.000):   570 EUR
  ----------------------------
  Rechnung an NP:              1.470 EUR

8 NP x 1.470 EUR:             11.760 EUR  (Gesamteinnahmen von NP)
+ Foerderbetrag PT:           16.800 EUR
= Gesamteinnahmen Cubintec:   28.560 EUR
./. NWM-Kosten netto:        -24.000 EUR
./. USt-Abfuhr:               -4.560 EUR
= Ergebnis:                        0 EUR
```

### 5.5 USt-Konfiguration pro NP

PZE erlaubt die Konfiguration des USt-Satzes je Netzwerkpartner:

  19,00 % -- Standard (vorsteuerabzugsberechtigt, Regelfall)
   0,00 % -- Steuerbefreit (z.B. gemeinnuetzige NP, Kommunen)

Bei 0% wird auf der Rechnung ausgewiesen:
  "Umsatzsteuerfrei gemaess ss 4 Nr. X UStG"
  Rechnungsbetrag = Eigenanteil netto (kein USt-Anteil)

### 5.6 Datenbankfelder fuer USt

In `v7_netzwerk_partner`:
```sql
ust_satz  NUMERIC(4,2) NOT NULL DEFAULT 19.00  -- 0.00 oder 19.00
```

In `v7_netzwerk_eigenanteile` (Snapshot zum Zeitpunkt der Berechnung):
```sql
anteil_gesamtleistung_netto  NUMERIC(14,2) NOT NULL,
-- = nwm_kosten_gesamt x eigenanteil_quote / 100

foerderanteil_pt             NUMERIC(14,2) NOT NULL,
-- = foerderbetrag_pt_gesamt x eigenanteil_quote / 100

betrag_soll                  NUMERIC(14,2) NOT NULL,
-- = anteil_gesamtleistung_netto - foerderanteil_pt  (Eigenanteil netto)

ust_satz                     NUMERIC(4,2)  NOT NULL,
ust_betrag                   NUMERIC(14,2) NOT NULL,
-- = anteil_gesamtleistung_netto x ust_satz / 100

betrag_brutto                NUMERIC(14,2) NOT NULL
-- = betrag_soll + ust_betrag
```

---

## 6. Datenbankmodell (vollstaendig)

### 6.1 Erweiterung v7_projects

```sql
ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS netzwerk_typ        TEXT,
  -- 'national' | 'international'

  ADD COLUMN IF NOT EXISTS netzwerk_phase      TEXT,
  -- 'phase1' | 'phase2'

  ADD COLUMN IF NOT EXISTS bewilligung_datum   DATE,
  -- Datum Zuwendungsbescheid Phase 1 (Startpunkt Laufzeitjahr-Rechnung)

  ADD COLUMN IF NOT EXISTS phase2_start_datum  DATE,
  -- Datum Bewilligung Phase 2 (Startpunkt neuer Laufzeitjahr-Zaehler)

  ADD COLUMN IF NOT EXISTS foerdersatz_stufen  JSONB;
  -- Automatisch befuellt, kann manuell ueberschrieben werden
```

foerdersatz_stufen JSONB-Struktur:
```json
[
  {"laufzeitjahr": 1, "satz_percent": 70, "gueltig_ab": "2025-04-01"},
  {"laufzeitjahr": 2, "satz_percent": 50, "gueltig_ab": "2026-04-01"},
  {"laufzeitjahr": 3, "satz_percent": 30, "gueltig_ab": "2027-04-01"}
]
```

Die Stufen werden beim Speichern des Bewilligungsdatums automatisch befuellt.
Manuelles Ueberschreiben einzelner Zeilen ist moeglich.

### 6.2 Neue Tabelle v7_netzwerk_partner

```sql
CREATE TABLE IF NOT EXISTS v7_netzwerk_partner (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,

  -- Stammdaten
  name                  TEXT NOT NULL,
  rechtsform            TEXT,
  ansprechpartner       TEXT,
  email                 TEXT,
  adresse_strasse       TEXT,
  adresse_plz           TEXT,
  adresse_ort           TEXT,
  ust_id                TEXT,           -- USt-IdNr. des NP (fuer Rechnung)

  -- Quotenlogik
  eigenanteil_quote     NUMERIC(5,2) NOT NULL DEFAULT 0,
  -- Prozentualer Anteil 0,00 - 100,00
  -- Summe aller aktiven NP muss 100,00 ergeben

  quote_manuell_gesperrt BOOLEAN NOT NULL DEFAULT FALSE,
  -- TRUE = diese Quote wird bei Auto-Anpassung nicht veraendert

  -- Umsatzsteuer
  ust_satz              NUMERIC(4,2) NOT NULL DEFAULT 19.00,
  -- 0.00 = steuerbefreit, 7.00 = ermaessigt, 19.00 = Standard

  -- Laufzeit
  beitritt_datum        DATE NOT NULL,
  austritt_datum        DATE,           -- NULL = aktiv

  notizen               TEXT,
  sort_order            INTEGER DEFAULT 0, -- Reihenfolge in der Tabelle

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT nwp_quote_range
    CHECK (eigenanteil_quote >= 0 AND eigenanteil_quote <= 100),
  CONSTRAINT nwp_ust_valid
    CHECK (ust_satz IN (0.00, 7.00, 19.00))
);

CREATE INDEX IF NOT EXISTS idx_v7_nwp_project
  ON v7_netzwerk_partner(project_id);
```

### 6.3 Neue Tabelle v7_netzwerk_eigenanteile

```sql
CREATE TABLE IF NOT EXISTS v7_netzwerk_eigenanteile (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,
  partner_id            UUID NOT NULL REFERENCES v7_netzwerk_partner(id) ON DELETE CASCADE,
  za_id                 UUID REFERENCES v7_zahlungsanforderungen(id),

  -- Abrechnungsperiode (= ZA-Periode, quartalsweise)
  periode_von           DATE NOT NULL,
  periode_bis           DATE NOT NULL,

  -- Berechnungs-Snapshot (unveraenderlich nach Erstellung)
  nwm_kosten_gesamt     NUMERIC(14,2) NOT NULL, -- Netto-Gesamtkosten NWM im Quartal
  foerdersatz_percent   NUMERIC(5,2)  NOT NULL, -- Angewandter Foerdersatz
  eigenanteil_quote     NUMERIC(5,2)  NOT NULL, -- Quote des NP zum Berechnungszeitpunkt
  betrag_soll           NUMERIC(14,2) NOT NULL, -- Netto-Eigenanteil = Gesamtkosten x (1-Foerdersatz) x Quote/100
  ust_satz              NUMERIC(4,2)  NOT NULL, -- USt-Satz zum Zeitpunkt der Berechnung
  ust_betrag            NUMERIC(14,2) NOT NULL, -- = betrag_soll x ust_satz / 100
  betrag_brutto         NUMERIC(14,2) NOT NULL, -- = betrag_soll + ust_betrag

  -- Rechnungsdaten
  rechnung_nr           TEXT,
  rechnung_datum        DATE,

  -- Zahlungsstatus
  betrag_ist            NUMERIC(14,2),  -- Tatsaechlich eingegangener Brutto-Betrag
  eingegangen_am        DATE,
  status                TEXT NOT NULL DEFAULT 'offen',
  -- 'offen' | 'bezahlt' | 'gemahnt' | 'storniert'

  notizen               TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT v7_nwm_ea_unique
    UNIQUE (partner_id, periode_von, periode_bis)
);

CREATE INDEX IF NOT EXISTS idx_v7_nwm_ea_project
  ON v7_netzwerk_eigenanteile(project_id);
CREATE INDEX IF NOT EXISTS idx_v7_nwm_ea_partner
  ON v7_netzwerk_eigenanteile(partner_id);
CREATE INDEX IF NOT EXISTS idx_v7_nwm_ea_za
  ON v7_netzwerk_eigenanteile(za_id);
```

### 6.4 Erweiterung v7_zahlungsanforderungen (fuer ZIM_NETZWERK)

```sql
ALTER TABLE v7_zahlungsanforderungen
  ADD COLUMN IF NOT EXISTS nwm_personalkosten   NUMERIC(14,2),
  -- Aus ZE berechnet (foerderfaehige Stunden x hourly_rate_approved)

  ADD COLUMN IF NOT EXISTS nwm_kosten_dritte    NUMERIC(14,2),
  -- Manuell eingetragen (Auftraege an Dritte)

  ADD COLUMN IF NOT EXISTS nwm_kosten_uebrige   NUMERIC(14,2),
  -- = nwm_personalkosten x 100% (laut Richtlinie pauschal)

  ADD COLUMN IF NOT EXISTS nwm_kosten_gesamt    NUMERIC(14,2),
  -- = nwm_personalkosten + nwm_kosten_dritte + nwm_kosten_uebrige

  ADD COLUMN IF NOT EXISTS laufzeitjahr         INTEGER;
  -- Automatisch berechnet aus bewilligung_datum + ZA-Periode
```

---

## 7. Dokumente und Ausgaben

### 7.1 Rechnung Cubintec -> Netzwerkpartner

Format: PDF (window.print(), A4 Hochformat)

Aufbau:

```
========================================================
RECHNUNG
========================================================

Von:   Cubintec GmbH
       Rederstrasse 24
       97616 Bad Neustadt a.d. Saale
       USt-IdNr.: [Cubintec USt-ID]

An:    [NP-Name]
       [NP-Strasse]
       [NP-PLZ NP-Ort]
       USt-IdNr.: [NP-USt-ID] (falls vorhanden)

Rechnungsnummer:   [rechnung_nr]
Rechnungsdatum:    [rechnung_datum]
Faelligkeitsdatum: [rechnung_datum + 30 Tage]

Betreff: Netzwerkmanagement [Projektname] - Eigenbeteiligung
         Abrechnungszeitraum [periode_von] bis [periode_bis]

--------------------------------------------------------
LEISTUNGSBESCHREIBUNG
--------------------------------------------------------

Erbrachte Managementleistungen gemaess ZIM-Foerderrichtlinie
2024, Anlage 1, fuer das ZIM-Innovationsnetzwerk
[Projektname] (Foerderzeichen: [funding_reference])
im Zeitraum [periode_von] bis [periode_bis].

--------------------------------------------------------
RECHNUNGSPOSITIONEN
--------------------------------------------------------

Pos. 1: Anteilige Netzwerkmanagement-Kosten

  NWM-Gesamtkosten (netto):         [nwm_kosten_gesamt] EUR
  Foerdersatz PT (Laufzeitjahr [X]):[foerdersatz_percent] %
  Foerderbetrag PT:                 [foerderbetrag] EUR
  Eigenanteil gesamt (netto):       [eigenanteil_gesamt] EUR

  Vereinbarter Anteil [NP-Name]:    [eigenanteil_quote] %
  --------------------------------------------------------
  NWM-Gesamtleistung netto:         [nwm_kosten_gesamt] EUR
  Ihr Anteil [eigenanteil_quote]%:  [anteil_gesamtleistung_netto] EUR
  ./. Foerderanteil PT:            -[foerderanteil_pt] EUR
  = Eigenanteil netto:              [betrag_soll] EUR

  zzgl. USt [ust_satz]% auf        [anteil_gesamtleistung_netto] EUR
       (Gesamtleistungsanteil):     [ust_betrag] EUR
  ========================================================
  Rechnungsbetrag:                  [betrag_brutto] EUR

[ODER FUER STEUERBEFREITE NP (USt-Satz = 0%):]
  NWM-Gesamtleistung netto:         [nwm_kosten_gesamt] EUR
  Ihr Anteil [eigenanteil_quote]%:  [anteil_gesamtleistung_netto] EUR
  ./. Foerderanteil PT:            -[foerderanteil_pt] EUR
  = Eigenanteil netto:              [betrag_soll] EUR
  Umsatzsteuer: steuerfrei gemaess ss 4 Nr. X UStG    0,00 EUR
  ========================================================
  Rechnungsbetrag:                  [betrag_soll] EUR

--------------------------------------------------------
ZAHLUNGSINFORMATIONEN
--------------------------------------------------------

Bitte ueberweisen Sie den Betrag von [betrag_brutto] EUR
bis zum [faelligkeitsdatum] auf folgendes Konto:

  Kontoinhaber: Cubintec GmbH
  Bank:         [Bankname]
  IBAN:         [IBAN]
  BIC:          [BIC]
  Verwendungszweck: [rechnung_nr] [NP-Name-kurz]

Foerderprojekt:  [funding_reference] | [Projektname]
Projekttraeger:  VDI/VDE Innovation + Technik GmbH
Richtlinie:      ZIM-Foerderrichtlinie 2024
========================================================
```

### 7.2 PT-Nachweis: Eingangs-Uebersicht Eigenbeteiligungen

Format: PDF (window.print(), A4 Hochformat)
Zweck: Pflichtnachweis fuer ZA-Einreichung gemaess ZIM-Richtlinie 6.2.5 d)

```
========================================================
NACHWEIS EIGENBETEILIGUNGEN NETZWERKPARTNER
========================================================

Netzwerk:           [Projektname]
Foerderzeichen:     [funding_reference]
Abrechnungszeitraum:[periode_von] bis [periode_bis]
Erstellt am:        [Datum]
Erstellt von:       Cubintec GmbH als NWM

Foerderparameter:
  Netzwerktyp:         national / international
  Foerderphase:        Phase X, Laufzeitjahr X
  Foerdersatz NWM:     XX %
  Eigenanteilsquote:   XX %
  NWM-Kosten gesamt:   XXXX EUR (netto)
  Eigenanteil gesamt:  XXXX EUR (netto)

--------------------------------------------------------
NACHWEIS EINGEGANGENER EIGENBETEILIGUNGEN
--------------------------------------------------------

| Nr. | Netzwerkpartner  | Anteil | Soll (netto) | Eingeg. am | Status   |
|-----|------------------|--------|--------------|------------|----------|
|  1  | TechCorp GmbH    | 20,00% |    1.440 EUR | 15.04.2025 | bezahlt  |
|  2  | InnoTech GmbH    | 20,00% |    1.440 EUR | 12.04.2025 | bezahlt  |
|  3  | StartupA GmbH    | 15,00% |    1.080 EUR | -          | offen    |
     ...

  Eigenanteil Soll gesamt (netto):  XXXX EUR
  Davon eingegangen:                XXXX EUR
  Noch ausstehend:                  XXXX EUR

HINWEIS: Fuer die Auszahlung der Foerdermittel gemaess
ZIM-Richtlinie 2024, Abschnitt 6.2.5 d) sind die als
"bezahlt" ausgewiesenen Eigenbeteiligungen nachgewiesen.

Bestaetigung der Netzwerkmanagementeinrichtung:
Mit Einreichung dieser Zahlungsanforderung bestaetigt
Cubintec GmbH, dass die als "bezahlt" ausgewiesenen
Eigenbeteiligungen fuer den genannten Zeitraum eingegangen
sind und als Nachweis erbrachter Managementleistungen dienen.

  Bad Neustadt a.d. Saale, den ____________

  ____________________________
  Martin Ditscherlein, Cubintec GmbH
  (Netzwerkmanagement)
========================================================
```

---

## 8. UI-Konzept im Berater-Portal

### 8.1 Einbindung

Das NWM-Modul erscheint als Tab in der Projektdetailseite,
ausschliesslich wenn `funding_format = 'ZIM_NETZWERK'`:

```
[Uebersicht] [Arbeitsplan] [Team] [Zeiterfassung] [ZA] [Netzwerk]
```

### 8.2 NWM-Tab: Unterstruktur

```
[Netzwerk]
  |- [Einstellungen]       Foerdersatz-Stufen, Bewilligungsdaten, Netzwerktyp
  |- [Netzwerkpartner]     NP verwalten, Quoten pflegen (inkl. Smart-Anpassung)
  |- [Eigenanteile]        Berechnung, Zahlungsstatus, Dokumente
```

### 8.3 Tab Netzwerkpartner: Quoten-Tabelle mit Smart-Anpassung

Spalten: Nr. | Name | Rechtsform | Quote % | USt-Satz | Status | Aktionen

- Quotenfeld: editierbares Zahlenfeld
- Schloss-Icon je NP (grau = frei, geschlossen = manuell gesperrt)
- Summenzeile am Ende:
  - Gruen wenn Summe = 100,00%
  - Rot mit Hinweis wenn Summe != 100,00%
- Buttons:
  - [Gleichverteilen]    -> alle Quoten auf 100/n, alle Sperren loeschen
  - [Alle entsperren]    -> nur Sperren loeschen, Quoten behalten
  - [NP hinzufuegen]
  - [NP ausscheiden]     -> Dialog mit Option A/B

Verhalten beim Editieren einer Quote:
- Feld verlassen (onBlur) loest Smart-Anpassung aus
- Animierter Refresh der anderen Felder
- Geaenderter NP wird automatisch gesperrt
- Toast-Meldung: "Quote angepasst. X Partner wurden automatisch neu verteilt."

### 8.4 Tab Eigenanteile

Quartal-Selektor (Dropdown) oben.

Kacheln:
  NWM-Kosten netto | Foerdersatz | Foerderbetrag PT | Eigenanteil netto
  Eigenanteil offen | Eigenanteil bezahlt

NP-Tabelle:
  Name | Quote | Soll netto | USt | Soll brutto | Rechnung | Eingegangen | Status | Aktionen

Aktionen je Zeile:
  [Zahlung erfassen]  -> Datum + Betrag (Brutto)
  [Rechnung PDF]      -> Einzelrechnung generieren
  [Gemahnt]           -> Status -> gemahnt

Buttons unten:
  [Eigenanteile berechnen]   -> Berechnet/aktualisiert alle offenen Eintraege
  [Alle Rechnungen erstellen] -> PDF-Batch fuer alle offenen NP
  [PT-Nachweis]              -> PT-Nachweis-PDF fuer aktuelles Quartal

---

## 9. Verknuepfung mit dem ZA-Workflow

### 9.1 Foerdersatz automatisch in ZA

Wenn eine ZA fuer ein ZIM_NETZWERK-Projekt erstellt wird:
1. PZE berechnet das Laufzeitjahr aus bewilligung_datum + ZA-Zeitraum
2. Foerdersatz_percent wird automatisch aus foerdersatz_stufen gesetzt
3. NWM-Personalkosten werden aus den ZE-Daten des Zeitraums berechnet
4. Felder nwm_personalkosten, nwm_kosten_uebrige, nwm_kosten_gesamt werden befuellt
5. nwm_kosten_dritte bleibt manuell eingebbar

### 9.2 Eigenanteile-Check bei ZA-Einreichung

Beim Statuswechsel ZA -> "Eingereicht":
- PZE prueft: Gibt es Eigenanteil-Datensaetze fuer den ZA-Zeitraum?
- Falls noch keine vorhanden: Hinweis "Eigenanteile noch nicht berechnet"
- Falls vorhanden und alle bezahlt: Gruen
- Falls vorhanden und noch offen: Warnung (kein Blocker):
  "X von Y Netzwerkpartner haben ihren Eigenanteil noch nicht bezahlt.
   Der PT-Nachweis wird mit aktuellem Status erstellt."

### 9.3 PT-Nachweis-Button im ZAPanel

Im ZAPanel erscheint fuer ZIM_NETZWERK ein zusaetzlicher Button:
[PT-Nachweis Eigenanteile] -> oeffnet PDF direkt fuer den ZA-Zeitraum

---

## 10. Implementierungsreihenfolge

### Schritt 1: SQL-Migration (1 Datei: migration_nwm_modul_v7_4_5.sql)
- Erweiterung v7_projects
- Neue Tabelle v7_netzwerk_partner
- Neue Tabelle v7_netzwerk_eigenanteile
- Erweiterung v7_zahlungsanforderungen

### Schritt 2: ZA-Integration (ZAPanel anpassen)
- Foerdersatz auto aus foerdersatz_stufen
- Laufzeitjahr anzeigen
- NWM-Kostenfelder (nur ZIM_NETZWERK)
- PT-Nachweis-Button

### Schritt 3: NWM-Tab (neue Komponenten)
- NWMTab-v7_4_5-1.tsx (Hauptkomponente mit Sub-Tabs)
- NWMEinstellungenPanel (Foerdersatz-Stufen, Bewilligungsdaten)
- NWMPartnerPanel (Quoten-Tabelle inkl. Smart-Anpassung)
- NWMEigenanteilPanel (Berechnung + Zahlungsstatus)

### Schritt 4: PDF-Dokumente
- NWMRechnungPDF (Rechnung Cubintec -> NP)
- NWMPTNachweisPDF (Eingangs-Uebersicht fuer PT)

---

## 11. Offene Punkte

| # | Thema                    | Vorschlag / Stand                                         |
|---|--------------------------|-----------------------------------------------------------|
| 1 | Rechnungsnummernkreis    | Format R-JJJJ-NNN, automatisch hochzaehlen pro Projekt    |
| 2 | Bankdaten Cubintec       | Einmalig in Berater-Firmendaten hinterlegen               |
| 3 | Mahnsystem               | Nur Status "gemahnt" + manuelle E-Mail (kein Auto-Versand)|
| 4 | USt-ID Cubintec          | In Berater-Firmendaten hinterlegen                        |
| 5 | Faelligkeitsfrist        | 30 Tage Standard, konfigurierbar pro Projekt?             |
| 6 | Mehrere Netzwerke        | Ja, normaler Fall - kein Problem im Datenbankmodell       |

---

## 12. Einordnung im Pflichtenheft

Ersetzt Pflichtenheft-Abschnitt 6.6 vollstaendig.
Wird als Abschnitt 6.7 "NWM-Modul" eingefuegt.

Dateinamen bei Implementierung (Versionsschema v7_4_5):
  migration_nwm_modul_v7_4_5.sql
  ZAPanel-v7_4_4-22.tsx  (naechster Build-Index nach -21)
  ProjectDetailPage-v7_4_4-32.tsx
  NWMTab-v7_4_5-1.tsx
  NWMPartnerPanel-v7_4_5-1.tsx
  NWMEigenanteilPanel-v7_4_5-1.tsx
  NWMDokumente-v7_4_5-1.tsx
