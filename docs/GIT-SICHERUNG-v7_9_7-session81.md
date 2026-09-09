# GIT-SICHERUNG - Session 81 (V7.9.7)

**Datum:** 08./09. September 2026
**SW-Release:** V7.9.7 (Bundesland-Fix Firmendaten, WAZ-Quelle vereinheitlicht,
Elternzeit als Abwesenheitscode E, "sonstige Arbeiten" immer als Differenz - in PRODUKTION)
**Pflichtenheft:** v5.40
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_6-session80.md (NWM-Jahresselektor, FZ-basierte Foerderquote).

**Stand main:** `17d2bfe` "Merge v7-dev: TimesheetForm v7.4.6-96" - identisch auf
**origin/main** und **cubintec/main** (beide Remotes gepusht, Vercel deployed).

**Release-Tag:** `v7.9.7` (annotiert, auf `17d2bfe`), gepusht auf origin und cubintec.
Auschecken mit `git checkout v7.9.7`. **Hinweis zur Tag-Historie:** Der zuvor juengste
Tag war `v7.4.1-1-stable`; die Releases V7.4.2 bis V7.9.6 wurden nicht getaggt.
Rueckwirkendes Taggen wurde bewusst unterlassen, da die Zuordnung Release -> Commit
fuer diese Staende nicht lueckenlos dokumentiert ist. Ab V7.9.7 wird jeder
Produktionsstand getaggt (`vX.Y.Z`, annotiert, auf beide Remotes).

**Deploy-Stand:** In PROD deployt. **MIT SQL:** CHECK-Constraint auf
v7_employee_absences.absence_code in DEV **und** PROD erweitert.
Vier Themenbloecke, elf Datei-Builds.

---

## Ziel dieser Etappe

1. **Bundesland-Fix in den Firmendaten.**
2. **Eine Quelle fuer die Wochenarbeitszeit** (Stammsatz vs. projektbezogene pWAZ).
3. **Elternzeit im Stundennachweis** als neuer Abwesenheitscode E.
4. **"Sonstige Arbeiten"** folgen wieder zuverlaessig den Projektstunden.

---

## Weg zur Loesung

### Thema 1 - Bundesland-Fix (FirmendatenCard v7.4.6-2)

**Symptom:** Bei der Firmen-Neuanlage eingetragenes Bundesland stand im
Bearbeiten-Modal auf "-- Bitte auswaehlen --".

**Ursache:** Zwei Wertformate. Die Neuanlage (foerderung-page) speichert ISO-Codes
(`DE-SH`), die FirmendatenCard arbeitete mit Langnamen (`Schleswig-Holstein`) als
Option-Werten. Ein `<select value="DE-SH">` findet keine passende Option und faellt
auf den Leereintrag zurueck. Ein Speichern haette den Langnamen zurueckgeschrieben -
gemischte Schreibweisen in `v7_client_companies.federal_state`.

**Fix:** BUNDESLAENDER als `{ code, name }` mit denselben ISO-Codes wie die Neuanlage;
Option-Value = Code, Label = Name. Vorbelegung ueber `normalizeStateCode()` - dadurch
wird auch Altbestand mit Langnamen korrekt vorausgewaehlt. Gespeichert wird immer der
ISO-Code, angezeigt der Klartextname.

**Datenpruefung:** `SQL-CHECK-federal-state-iso-v1.sql`.

### Thema 2 - WAZ-Quelle vereinheitlicht (TimesheetForm v7.4.6-88, ProjectTeamManager v7.4.4-20)

**Ausloeser:** Ein MA zeigte in der MA-Liste 40 h/Woche, im Projektteam standen 30 h
(pWAZ). Die Zeiterfassung rechnete mit 40 - die rote Ampel kam zu spaet.

**Ergebnis:** Zwei Felder mit verschiedenen Aufgaben:
- `v7_employees.weekly_hours` (+ Teilzeit-Historie) = wie lange arbeitet der MA.
  **Massgeblich fuer die Zeiterfassung.**
- `v7_project_assignments.personal_weekly_hours` (pWAZ) = Nenner der
  Anlage-6.1-Stundensatzkalkulation, an Antrag/Bescheid gebunden, darf sich bei einer
  spaeteren Vertragsaenderung NICHT rueckwirkend mitaendern.

**Zwischenstand v7.4.6-87 (verworfen):** Gab kurzzeitig der pWAZ Vorrang; durch -88
vollstaendig zurueckgenommen.

**Endstand:**
- **TimesheetForm v7.4.6-88:** Rangfolge Teilzeit-Historie zum Monatsersten ->
  `v7_employees.weekly_hours` -> Firmenstandard. Die Anzeige "x h/Woche" neben der
  MA-Auswahl nennt die Quelle ("lt. Historie" / "lt. Stammdaten" / "Firmenstandard").
- **ProjectTeamManager v7.4.4-20:** Komponente `PWazDivergenzHinweis`. Weicht die pWAZ
  vom aktuellen Stammsatz ab (Toleranz 0,01 h), erscheint im Add- und Edit-Dialog ein
  Hinweis mit beiden Werten. **Kein** Schreibzugriff, keine automatische Uebernahme.

**Doku:** KONZEPT-ARBEITSZEITGRENZEN-v1_4.md Paragraph 2.4, 5.6, 7.

### Thema 3 - Elternzeit als Abwesenheitscode E

**Konzept:** KONZEPT-ELTERNZEIT-TIMESHEET-v1_0.md (inkl. Bestaetigung des
Projekttraegers VDI vom 08.09.2026).

**Abgrenzung:** Teilzeit waehrend der Elternzeit ist KEIN Fall fuer E, sondern ein
neuer Eintrag in der Wochenstunden-Historie.

**DB (DEV + PROD):** CHECK-Constraint von ('U','K','S') auf ('U','K','S','E'),
Constraint-Name `v7_employee_absences_absence_code_check`, Skript
`SQL-MIGRATION-absence-code-E-dev-v1.sql`. E-Zeilen: `hours = 0`,
`note = 'Elternzeit'`, kein `project_id`.

**Builds:**
- **v7.4.6-89 (Schutz zuerst):** Der Monats-Abgleich beim Speichern deaktivierte jede
  aktive Abwesenheitszeile des Monats, die nicht im Soll-Stand steht; der Soll-Stand
  kennt nur U/K/S. Die Ist-Abfrage filtert jetzt auf `absence_code IN ('U','K','S')`.
- **v7.4.6-90 (Lesepfad):** E-Tage laden (State `elternzeitDays`),
  `getAbsenceCodeForDay` liefert auch 'E' -> Tagessperre; Anzeigezeile "Elternzeit
  (E, keine Arbeitszeit)" mit Tageszahl; Feiertags-Vorbelegung der S-Zeile
  ueberspringt E-Tage.
- **v7.4.6-91:** An E-Tagen auch die Fehlzeit-Zeilen U/K/S gesperrt; `canEdit`
  ueberspringt sie in der Navigation.
- **v7.4.6-92 (Eingabe):** Bereichsdialog. Ausloeser Rechtsklick oder Eingabe "E".
  Von/Bis + Vorschau: Zahl der Tage, bereits erfasste E-Tage, zu ersetzende U/K/S
  (Vorgabe ersetzen, Paragraph 17 BEEG), Tage mit erfassten Arbeitsstunden (werden
  NICHT ueberschrieben, mit Datumsliste), abgeschlossene Monate (uebersprungen).
  Geschrieben werden alle Tage Mo-Fr inklusive Feiertagen. Ruecknahme im selben
  Dialog. Berechtigung: `portal === 'berater' || isAdmin`.
- **v7.4.6-93:** Das deaktivierte Eingabefeld einer gesperrten Zelle verschluckte das
  contextmenu-Ereignis (Browser-Menue statt PZE-Menue); fuer Kurzarbeit war das per
  `pointer-events-none` bereits geloest, fuer Abwesenheitstage fehlte es.
- **stundennachweisSheetData v1.0.2:** E als Tag-Marker, keine Feiertags-Vorbelegung.
- **StundennachweisSheet v1.0.4:** E-Zeile im Sammeldruck.

### Thema 4 - "Sonstige Arbeiten" immer als Differenz (v7.4.6-94, -95, -96)

**Symptom:** Beim Aendern der Projektstunden blieb die Zeile auf einem alten Wert
stehen; in derselben Zeile standen Werte aus verschiedenen Momenten.

**Ursache:** Beim Laden eines gespeicherten Monats wurde jeder Tag als "manuell
geaendert" markiert, dessen Wert nicht exakt `Tagesstunden - Projekt - andere
Projekte` entsprach. Die Auto-Vorbelegung rechnet aber zusaetzlich mit einem
**Wochendeckel** (v7.4.6-74) und liefert legitim kleinere Werte - diese galten
faelschlich als manuell und wurden eingefroren.

**Entscheidung (Martin, 08.09.2026):** "Sonstige Arbeiten" ist immer die Differenz
und wird nie eingefroren.

- **v7.4.6-94:** Keine manuellen Overrides mehr ableiten; eine Eingabe in der Zeile
  setzt den Tag nicht mehr auf "manuell".
- **v7.4.6-95:** Einheitliches Zahlenformat in allen Stundenzellen (`fmtHCell`:
  ganze Zahlen ohne Nachkommastellen, sonst zwei Stellen mit Komma). Zuvor standen
  Datenbankwerte roh ("8", "4.67") neben formatierten Auto-Werten ("2,00").
- **v7.4.6-96:** Die Unterscheidung neuer/gespeicherter Monat entfaellt; auch ein
  leeres Feld wird wieder gefuellt (gemeldet am 16.06.2026: Projekt auf 4,67
  reduziert, "sonstige" blieb leer statt 3,33).

**Unveraendert:** Wochenenden, Feiertage, gesperrte Tage, Kurzarbeit und
Abwesenheitstage bekommen keine Auto-Vorbelegung.

---

## DB-Aenderung

**Ja - eine.** CHECK-Constraint `v7_employee_absences_absence_code_check` um `'E'`
erweitert. Ausgefuehrt in **DEV** (`projektzeiterfassung20`) und **PROD**
(`PZE-production`, Ref `cnnuyioklhlrfygwticf`); Kontrollabfrage zeigt in beiden
Umgebungen `ARRAY['U','K','S','E']`. Keine Datenmigration.

---

## Code-Integration (Status) - V7.9.7

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| FirmendatenCard-v7_4_6-2.tsx | src/components/shared/FirmendatenCard.tsx | DEPLOYED |
| TimesheetForm-v7_4_6-96.tsx | src/components/shared/TimesheetForm.tsx | DEPLOYED (Endstand) |
| ProjectTeamManager-v7_4_4-20.tsx | src/components/shared/ProjectTeamManager.tsx | DEPLOYED |
| stundennachweisSheetData-v1_0_2.ts | src/lib/stundennachweisSheetData.ts | DEPLOYED |
| StundennachweisSheet-v1_0_4.tsx | src/components/shared/StundennachweisSheet.tsx | DEPLOYED |
| SQL-MIGRATION-absence-code-E-dev-v1.sql | Supabase DEV + PROD | AUSGEFUEHRT |
| SQL-CHECK-federal-state-iso-v1.sql | Supabase (Pruefskript) | optional |

TimesheetForm-Zwischenstaende -87 bis -95 sind im Endstand -96 aufgegangen; -87 wurde
bewusst zurueckgenommen. ASCII-Check (0 Nicht-ASCII) je Datei erfolgt. Deploy je Build
einzeln per Merge v7-dev -> main (--no-ff), push origin + cubintec.

---

## Verifikation (durch Martin bestaetigt)

- Thema 1: Bundesland wird korrekt vorausgewaehlt und im Klartext angezeigt.
- Thema 2: Zeiterfassung zeigt "40 h/Woche (lt. Historie)"; pWAZ-Divergenz erscheint
  im Team-Dialog.
- Thema 3 (DEV, Testdaten anschliessend deaktiviert): Anzeige 22 Tg.; Speichern
  erhaelt E; U/K/S an E-Tagen gesperrt; Sammeldruck zeigt die E-Zeile; Bereichsdialog
  02.11.-20.11.2026 -> 15 Tage; Ruecknahme 04.-06.11. -> 12 Tage.
  **Echtfall (Flensburger Yacht-Service, SmartMarina, April 2026):** Kollision mit
  erfassten Projektstunden gemeldet; nach Bereinigung 16 E-Tage inkl. Karfreitag und
  Ostermontag, "Sonstige bezahlte Ausfallzeiten" = 0,00.
- Thema 4: "sonstige"-Zelle folgt mehrfach hintereinander, auch auf zuvor leeren
  Tagen (16.06.2026: 4,67 -> 3,33); Zahlenformat einheitlich.

---

## Offen / naechste Schritte

- **Kapazitaetsplanung** (`/v7/berater/multiprojekt`) beruecksichtigt E-Tage nicht.
- **Warnung bei verplanten Arbeitsplan-PM** im E-Zeitraum.
- Anleitungen (Admin, PL) um das Kapitel Elternzeit ergaenzen.
- Doku-Lueckenschluss im Repository: docs/ enthaelt bis Session 75/PH v5.36; die
  Aenderungsbloecke v5.37/v5.38 und GIT-SICHERUNG v7_9_4/v7_9_5 fehlen dort.
- Uebernommen aus frueheren Sessions: Restanzeige-Modus "monatsende" mit
  projektweiter Zahl im Zell-Tooltip; automatisierte Stundenvorschlaege; KMU-innovativ
  PDF-Import; Enum-Vereinheitlichung v7_funding_format DEV/PROD; Manuals-Nachzug;
  Datenhygiene Loesch-Kaskade; 'Assistenz GL'-Rolle; A-013 Legacy-Cluster.

---

## Komponenten / Dateien dieser Etappe (deployed src/)

- src/components/shared/FirmendatenCard.tsx (v7.4.6-2)
- src/components/shared/TimesheetForm.tsx (v7.4.6-96)
- src/components/shared/ProjectTeamManager.tsx (v7.4.4-20)
- src/lib/stundennachweisSheetData.ts (v1.0.2)
- src/components/shared/StundennachweisSheet.tsx (v1.0.4)

**DB:** CHECK-Constraint absence_code um 'E' erweitert (DEV + PROD).

**Git:** `main` = `17d2bfe`, Tag `v7.9.7` auf origin und cubintec.

**Doku:** PFLICHTENHEFT-v5_40-AENDERUNGSBLOCK.md; GIT-SICHERUNG-v7_9_7-session81.md
(diese Datei); KONZEPT-ELTERNZEIT-TIMESHEET-v1_0.md; KONZEPT-ARBEITSZEITGRENZEN-v1_4.md;
VERHALTENSVERTRAG-v1_2.md; DEPLOY-PROZESS-PZE.md (unveraendert gueltig).
