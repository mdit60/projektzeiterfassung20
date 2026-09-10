# GIT-SICHERUNG - Session 81, Teil 2 (V7.9.8 + V7.9.9)

**Datum:** 09./10. September 2026
**SW-Release:** V7.9.8 (Dateinamen Stundennachweis-PDF) und V7.9.9 (Fortschritt/
Prognose: Verschenkt-Korrektur, Planungsluecke, entschlacktes Diagramm) - in PRODUKTION
**Pflichtenheft:** v5.42
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_7-session81.md (Bundesland, WAZ-Quelle, Elternzeit,
"sonstige Arbeiten").

**Stand main:** `51f465c` "Merge v7-dev: Cockpit-Diagramm angeglichen" - identisch auf
**origin/main** und **cubintec/main** (beide Remotes gepusht, Vercel deployed).
**Stand v7-dev:** `10ad13e`, identisch auf origin/v7-dev.

**Deploy-Stand:** In PROD deployt. **KEIN SQL** - ausschliesslich Frontend.
Drei Themen, fuenf Datei-Builds.

---

## Ziel dieser Etappe

1. **Einheitliche Dateinamen** fuer exportierte Stundennachweise.
2. **Widerspruchsfreie Foerder-Konsequenzen** (kein "Verschenkt" bei 100 Prozent).
3. **Lesbarer Monatsverlauf** und eine Beschriftung, die erklaert, was er zeigt.

---

## Weg zur Loesung

### Thema 1 - Dateinamen-Schema (TimesheetForm v7.4.6-97, StundennachweisMatrix v7.4.6-16)

**Vorgabe Martin:** `Name_FKZ_Stundennachweis_YYMM.pdf`.

**Festlegungen (Rueckfrage 09.09.2026):** Name = **nur Nachname**; beim Sammeldruck
mehrerer Mitarbeiter **entfaellt der Namensteil**; bei mehrmonatiger Auswahl
**Zeitraum als YYMM-YYMM**.

**Umsetzung:** Beide Druckwege setzen vor `window.print()` den `document.title`; der
Browser schlaegt ihn als Dateinamen vor und haengt `.pdf` selbst an.

| Fall | Dateiname |
|---|---|
| Einzeldruck | `Sarac_16DS251601_Stundennachweis_2510` |
| Sammeldruck, 1 MA | wie Einzeldruck, Zeitraum ggf. `2604-2606` |
| Sammeldruck, >1 MA | `16DS251601_Stundennachweis_2604-2606` |
| ohne Namen (Fallback) | `<FKZ>_Stundennachweis_<YYMM>` |

Nachname: erster Token, ASCII-gewandelt (Umlaute aufgeloest, scharfes s -> ss).
Ersetzt die zuvor **getrennten** Schemata aus v7.4.6-59 (Einzeldruck) und v7.4.6-9
(Sammeldruck).

### Thema 2 - "Verschenkt" korrigiert, Planungsluecke neu (projektfortschritt-utils v7.4.9-16, ProjektFortschrittPanel v7.4.5-34)

**Symptom:** SmartMarina zeigte gleichzeitig "Erreichungsgrad 100 Prozent" und
"Verschenkt: 2.697 EUR".

**Ursache (rechnerisch nachvollzogen):** Der Erreichungsgrad misst STUNDEN gegen den
Arbeitsplan (3.252 h Prognose / 3.252 h Plan = 100 Prozent). "Verschenkt" misst EURO
gegen die BEWILLIGTE SUMME (87.440 EUR), waehrend die Foerderprognose zuvor auf die
PLANKOSTEN gedeckelt wird (`min(Prognosekosten, Plankosten) x Foerdersatz`
= 121.062 x 0,7 = 84.743 EUR). Die Bewilligung setzt 87.440 / 0,7 = 124.914 EUR
foerderfaehige Kosten voraus, der Arbeitsplan plant nur 121.062 EUR - eine Differenz
von 3.852 EUR bzw. 2.697 EUR Foerderung. Diese Luecke ist **strukturell**: sie geht
auch bei perfekter Planerfuellung nicht zu, wurde aber als "verschenkt" ausgewiesen.

**Fix:** Massstab fuer "verschenkt" ist jetzt
`foerderbarPlanErfuellt = min(Plankosten x Foerdersatz, bewilligte Summe)` - also das,
was der Arbeitsplan bei voller Erfuellung hergibt. Bei 100 Prozent steht dort 0 EUR.
Die Bewilligungsdifferenz wird als eigenes Feld `planungsluecke` (+
`planungslueckeKosten`, `bewilligteSummeGesetzt`) zurueckgegeben und im Panel als
eigener, gelb markierter Block "Planungsluecke im Arbeitsplan" angezeigt - nur wenn
sie besteht - samt Handlungshinweis, dass nur eine Anpassung des Arbeitsplans die
Luecke schliesst.

**Bewusst NICHT angefasst:** der Prognose-Algorithmus selbst (Modellumschaltung
Auslastung/Planerfuellung, Szenarien, Bedarfsrechnung). Entscheidung Martin
(09.09.2026): erst die belegten Anzeigefehler korrigieren, die Vereinfachung des
Modells getrennt betrachten.

### Thema 3 - Monatsverlauf (ProjektFortschrittPanel v7.4.5-34, FirmaCockpit v7.4.9-36-15)

**Symptom a:** Drei gestrichelte Linien (Soll kumuliert, Prognose kumuliert,
Zieltempo kumuliert) im selben Diagramm - nicht unterscheidbar.
**Fix:** "Soll kumuliert" und "Zieltempo kumuliert" entfernt. Es bleiben "Ist
kumuliert" (durchgezogen) und "Prognose kumuliert" (gestrichelt).

**Symptom b:** Laut AP-Status ist AP 1 (April) vollstaendig gebucht, der April-Balken
zeigt aber nur rund die Haelfte.
**Befund - kein Rechenfehler.** Die beiden Ansichten messen Unterschiedliches: das
Diagramm zaehlt nach **Buchungsmonat**, der AP-Status je **Arbeitspaket**, unabhaengig
vom Buchungszeitpunkt. Beleg (SQL ueber v7_timesheets, PROD, 09.09.2026):

| Monat | AP 1 | AP 2.1 | AP 2.2 | AP 3 | AP 4 | ohne AP (nicht foerderbar) |
|---|---|---|---|---|---|---|
| 2026-04 | 134,67 | | | | | 127,33 |
| 2026-05 | 125,00 | 19,00 | | 165,00 | | 76,00 |
| 2026-06 | | 24,00 | 43,00 | 270,67 | 37,00 | 65,33 |
| 2026-07 | | | | 140,00 | 96,00 | |
| 2026-08 | | | | 48,00 | 200,67 | 81,33 |

AP 1: 260 h geplant im April, gebucht 259,67 h - davon 134,67 h **im April** und
125,00 h **im Mai**. Die foerderbaren Summen beider Sichten sind identisch
(1.303,01 h).
**Fix:** Die Fussnote benennt das jetzt ausdruecklich: Ist nach Buchungsmonat, Soll
gleichmaessig ueber die AP-Laufzeit; einzelne Monate weichen regelmaessig ab, auch
wenn das Arbeitspaket vollstaendig gebucht ist; massgeblich ist der kumulierte
Verlauf, der Stand je Arbeitspaket steht im AP-Status.

**Nachzug (10.09.2026):** Nach dem Deploy zeigte das **Firma-Cockpit** weiterhin drei
gestrichelte Linien. Ursache: das Cockpit haelt eine **eigene Kopie** des Diagramms
(FirmaCockpit.tsx), die beim ersten Durchgang uebersehen wurde. Kontrolle per Suche
nach `SollKumuliert|ZielProjektion` ueber src/ ergab genau drei Fundstellen
(ProjektFortschrittPanel, FirmaCockpit, projektfortschritt-utils); nach v7.4.9-36-15
sind beide Darstellungen identisch.

---

## DB-Aenderung

**Keine.** Ausschliesslich Frontend; kein SQL in DEV oder PROD.

---

## Code-Integration (Status) - V7.9.8 / V7.9.9

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| TimesheetForm-v7_4_6-97.tsx | src/components/shared/TimesheetForm.tsx | DEPLOYED (V7.9.8) |
| StundennachweisMatrix-v7_4_6-16.tsx | src/components/shared/StundennachweisMatrix.tsx | DEPLOYED (V7.9.8) |
| projektfortschritt-utils-v7_4_9-16.ts | src/lib/projektfortschritt-utils.ts | DEPLOYED (V7.9.9) |
| ProjektFortschrittPanel-v7_4_5-34.tsx | src/components/shared/ProjektFortschrittPanel.tsx | DEPLOYED (V7.9.9) |
| FirmaCockpit-v7_4_9-36-15.tsx | src/components/shared/FirmaCockpit.tsx | DEPLOYED (V7.9.9, Nachzug) |

ASCII-Check (0 Nicht-ASCII) je Datei erfolgt. Deploy je Thema per Merge v7-dev -> main
(--no-ff), push origin + cubintec.

**Commits dieser Etappe (main):**

| Commit | Inhalt |
|---|---|
| `dc4ad12` | Timesheet-PDF: Dateiname auf Schema Name_FKZ_Stundennachweis_YYMM |
| `2654e0b` | Merge v7-dev: Timesheet-PDF-Dateinamen (V7.9.8) |
| `31118e8` | Fortschritt/Prognose: Verschenkt-Korrektur, Planungsluecke, Diagramm entschlackt |
| `e67eca1` | Merge v7-dev: Fortschritt/Prognose-Korrekturen (V7.9.9) |
| `10ad13e` | FirmaCockpit v7.4.9-36-15: Monatsverlauf angeglichen |
| `51f465c` | Merge v7-dev: Cockpit-Diagramm angeglichen (Stand main) |

---

## Aufraeumen downloads/ (09.09.2026)

Vor dieser Etappe wurde downloads/ bereinigt (Skript
`aufraeumen-session81-v1.zsh`, von Martin nach Trockenlauf ausgefuehrt): 35 Moves,
Wurzelverzeichnis von 113 auf 93 Dateien. Je Basisname verbleibt nur die hoechste
Version; Altbuilds nach `archiv/code/<Komponente>/`, Alt-Doku nach `archiv/doku/`,
ausgefuehrte SQL-Skripte nach `archiv/sql/`, zwei Dubletten nach `archiv/dubletten/`.
Die Ordner "Claude outputs" und "doku-neu" wurden aufgeloest; die aktuellen
Doku-Staende liegen wieder in der Wurzel.

**Dabei entdeckte Nummernkollision:** Zwei verschiedene Aenderungsbloecke trugen die
Nummer v5.39 und vergaben beide A-055 (Session 78: Timesheet-AP-Obergrenze;
Session 80: NWM-Jahresselektor). Uebernommen worden war nur der Session-80-Block; die
Session-78-Aenderung (TimesheetForm v7.4.6-84, start-basierte Obergrenze
monthsSinceStart <= 3) fehlte im konsolidierten Pflichtenheft komplett. Nachgetragen
als **PFLICHTENHEFT-v5_41-AENDERUNGSBLOCK.md** unter der freien Nummer **A-061**
(Commit `cf34b44`, Merge `5935e0d`). Beide Ursprungsdateien liegen eindeutig benannt in
`downloads/archiv/doku/PFLICHTENHEFT/`.

---

## Verifikation (durch Martin bestaetigt)

- Thema 1: Einzel- und Sammeldruck liefern die erwarteten Dateinamen.
- Thema 2 (PROD, SmartMarina): "Weiter wie bisher" - Abrufbar 84.743 EUR,
  Erreichungsgrad 100 Prozent, **keine** Verschenkt-Zeile. "Bei 100 Prozent
  Zielerreichung" - Abrufbar 84.743 EUR, Verschenkt 0 EUR. Neuer Block
  "Planungsluecke im Arbeitsplan" - Nicht ausgeschoepft 2.697 EUR. Kennzahlen
  darueber unveraendert (3.252 h / 1.303 h / 100 Prozent).
- Thema 3: Fortschritts-Panel in DEV (anderes Projekt) und PROD (SmartMarina) mit zwei
  Linien; Firma-Cockpit nach dem Nachzug identisch.

---

## Offen / naechste Schritte

- **Kapazitaetsplanung** (`/v7/berater/multiprojekt`) beruecksichtigt E-Tage
  (Elternzeit) nicht - ein Mitarbeiter in Elternzeit erscheint mit voller Kapazitaet.
  Einziger offener Punkt mit fachlich falschen Zahlen; naechster Arbeitspunkt.
- **Warnung bei verplanten Arbeitsplan-PM** im E-Zeitraum.
- **Anleitungen** (Admin, PL) um das Kapitel Elternzeit ergaenzen.
- **VERHALTENSVERTRAG v1.3** mit den zwei aus dieser Etappe abgeleiteten Regeln
  (gemeinsamer Bezugsrahmen fuer gegeneinander gelesene Kennzahlen; Monatsverlauf
  existiert in zwei Implementierungen und ist immer in beiden zu aendern) - siehe
  Hinweis am Ende von PFLICHTENHEFT-v5_42-AENDERUNGSBLOCK.md.
- **Veraltetes Interface `V7Timesheet`** in `src/types/v7-types.ts`: beschreibt mit
  `year`, `month`, `daily_data` ein abgeloestes Schema, waehrend `v7_timesheets` eine
  Zeile je Tag mit `work_date`/`hours`/`work_package_id` fuehrt. Hat am 09.09.2026 zu
  einer fehlerhaften SQL-Abfrage gefuehrt. Kleine, risikoarme Korrektur.
- **Vereinfachung des Prognose-Modells** (Umschaltung Auslastung/Planerfuellung,
  Szenarien, Bedarfsrechnung) - bewusst vertagt, Anzeige ist jetzt korrekt.
- Uebernommen aus frueheren Sessions: Restanzeige-Modus "monatsende" mit projektweiter
  Zahl im Zell-Tooltip; automatisierte Stundenvorschlaege; KMU-innovativ PDF-Import;
  Enum-Vereinheitlichung v7_funding_format DEV/PROD; Manuals-Nachzug; Datenhygiene
  Loesch-Kaskade; 'Assistenz GL'-Rolle; A-013 Legacy-Cluster.

---

## Komponenten / Dateien dieser Etappe (deployed src/)

- src/components/shared/TimesheetForm.tsx (v7.4.6-97)
- src/components/shared/StundennachweisMatrix.tsx (v7.4.6-16)
- src/lib/projektfortschritt-utils.ts (v7.4.9-16)
- src/components/shared/ProjektFortschrittPanel.tsx (v7.4.5-34)
- src/components/shared/FirmaCockpit.tsx (v7.4.9-36-15)

**DB:** keine Aenderung.

**Git:** `main` = `51f465c` auf origin und cubintec; `v7-dev` = `10ad13e` auf origin.

**Doku:** PFLICHTENHEFT-v5_41-AENDERUNGSBLOCK.md (Nachtrag Session 78);
PFLICHTENHEFT-v5_42-AENDERUNGSBLOCK.md; GIT-SICHERUNG-v7_9_9-session81.md (diese
Datei); DEPLOY-PROZESS-PZE.md (unveraendert gueltig).
