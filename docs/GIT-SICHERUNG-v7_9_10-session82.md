# GIT-SICHERUNG - Session 82 (V7.9.10)

**Datum:** 11. September 2026
**SW-Release:** V7.9.10 (Kapazitaetsplanung beruecksichtigt Elternzeit) - in PRODUKTION
**Pflichtenheft:** v5.43
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_9-session81.md (Dateinamen Stundennachweis-PDF,
Verschenkt-Korrektur, Planungsluecke, Monatsverlauf).

**Stand main:** `ec2b101` "Merge v7-dev: Kapazitaetsplanung Elternzeit (v7.4.8-29)" -
identisch auf **origin/main** und **cubintec/main** (beide Remotes gepusht, Vercel
deployed, Status gruen).
**Stand v7-dev:** `94bf6b2`, identisch auf origin/v7-dev (zuvor `445a69c`).
**Release-Tag:** `v7.9.10` (annotiert, auf `ec2b101`), gepusht auf origin und cubintec.
Tags jetzt: v7.9.7, v7.9.8, v7.9.9, v7.9.10.

**Deploy-Stand:** In PROD deployt. **KEIN SQL** in PROD. In DEV nur das Deaktivieren
eigener Testdaten (siehe Verifikation).
Ein Thema, zwei Datei-Builds (-28 fachlich, -29 Optik), ein Commit.

---

## Ziel dieser Etappe

Die Kapazitaetsplanung (`/v7/berater/multiprojekt`) war der einzige offene Punkt mit
fachlich falschen Zahlen: Ein Mitarbeiter in Elternzeit erschien mit voller
Monatskapazitaet. Offener Punkt aus KONZEPT-ELTERNZEIT-TIMESHEET-v1_0.md Paragraph 11 und
GIT-SICHERUNG V7.9.9.

---

## Session-Auftakt (Versions-Check downloads/)

- 101 Dateien (93 nach dem Aufraeumen vom 09.09. + 8 Dateien aus Session 81 Teil 2).
- ASCII: alle 68 .ts/.tsx-Quelldateien 0 Nicht-ASCII.
- Noch in der Wurzel neben deployten Nachfolgern (normale Historie, archivreif):
  TimesheetForm-v7_4_6-96, StundennachweisMatrix-v7_4_6-15,
  projektfortschritt-utils-v7_4_9-15, ProjektFortschrittPanel-v7_4_5-33,
  FirmaCockpit-v7_4_9-36-14, GIT-SICHERUNG-v7_9_7-session81.md; ab jetzt zusaetzlich
  berater-multiprojekt-page-v7_4_8-27 und -28.
- Befund Infrastruktur: sechs Dateien in downloads/ waren iCloud-Platzhalter
  ("Resource deadlock avoided" beim Lesen aus der Cowork-VM). Sie wurden fuer die
  Pruefung heruntergeladen. Bei kuenftigen Versions-Checks kann dasselbe auftreten; ein
  Lesefehler ist dann KEIN ASCII-Befund.

---

## Weg zur Loesung

### Befund (berater-multiprojekt-page v7.4.8-27)

Monatskapazitaet = `countWorkdaysInMonth(jahr, monat, bundesland) x (WAZ / 5)`.
Abwesenheiten wurden gar nicht gelesen. Zwei Folgen:

1. **Zu hohe Kapazitaet** im Elternzeit-Monat.
2. **Irrefuehrende Ampel** bei naiver Korrektur: die bestehende Formel
   `freiProzent = gesamt > 0 ? frei / gesamt : 100` haette einen Voll-E-Monat
   (Kapazitaet 0) als "100 Prozent frei" gruen mit 0 h gezeigt.

### Umsetzung (v7.4.8-28)

1. E-Tage laden: `v7_employee_absences`, `absence_code = 'E'`, `is_active = true`,
   3-Jahres-Fenster der Ansicht, `.limit(10000)`.
2. Nur Arbeitstage zaehlen: Mo-Fr und kein Feiertag laut `getGermanHolidays(jahr,
   bundesland, region)` (dieselbe Funktion wie auf der FZul-Detailseite). Grund: Der
   Bereichsdialog schreibt E auch auf Feiertage (KONZEPT-ELTERNZEIT Paragraph 6.2),
   `countWorkdaysInMonth` zaehlt Feiertage aber nicht mit. Ohne diesen Filter waeren im
   Echtfall April 2026 16 statt 14 Tage abgezogen worden. Dubletten (MA + Datum) werden
   einmal gezaehlt; E-Arbeitstage nie mehr als Arbeitstage.
3. `gesamt = (Arbeitstage - E-Arbeitstage) x (WAZ / 5)`; neues Feld
   `gesamtOhneElternzeit` (bisheriger Wert), `elternzeitTage`, `elternzeitStunden`.
4. **Ampel-Basis = volle Monatskapazitaet ohne Elternzeit** (Entscheidung Martin,
   11.09.2026; Alternative "reduzierte Kapazitaet" verworfen). Beispiel: 48 h frei von
   160 h = 30 Prozent, gelb. Fuer MA ohne E-Tage ist `gesamtOhneElternzeit = gesamt` -
   Ergebnisse identisch mit -27.
5. **Voll-E-Monat** (`elternzeitTage > 0` und `gesamt = 0`): hellblaue Zelle "E"
   (`bg-sky-100`, Farbwelt wie die E-Zeile im TimesheetForm) statt Ampel. Rote Schrift,
   wenn im Monat trotzdem Stunden geplant oder verbucht sind; Tooltip-Warnzeile
   "Achtung: im Elternzeit-Monat sind Stunden eingeplant." (Entscheidung Martin).
6. Tooltip: "Monatskapazitaet" (voll), Zeile "Elternzeit (E), n Arbeitstage: -x h",
   "Verfuegbar: y h". Legende um "E = Elternzeit" ergaenzt.

### Warum das rote E gebraucht wird (Rueckfrage Martin, 11.09.2026)

Frage: Kann der Fall ueberhaupt eintreten, wenn E-Tage keine Stundenerfassung zulassen
und der Dialog Tage mit Stunden ueberspringt?

Antwort: Fuer **verbuchte** Stunden (Zeiterfassung) praktisch nein - der Dialog
ueberspringt Tage mit erfassten Stunden, E-Tage sind gesperrt; einzige Luecke sind
Wochenendbuchungen. Fuer **geplante** Stunden (Arbeitsplan-PM, gleichmaessig ueber die
AP-Laufzeit verteilt) **ja**: Der Elternzeit-Dialog prueft den Arbeitsplan nicht. Die
Personenmonate bleiben verplant, obwohl der MA sie nicht leisten kann. Das rote E ist
derzeit die einzige Stelle, an der das sichtbar wird. Die eigentliche Warnung gehoert in
die Vorschau des Dialogs (offener Punkt "Warnung bei verplanten Arbeitsplan-PM").

### v7.4.8-29 (Optik)

Beim DEV-Test stiess der Stundenwert im Tooltip bei langem Text an
("22 Arbeitstage:-176.0 h"). Fix: `gap-2` und `whitespace-nowrap`. In PROD bestaetigt.

---

## DB-Aenderung

**Keine** (Schema unveraendert, kein SQL in PROD).

In **DEV** wurden eigene Testdaten deaktiviert (nicht geloescht):

```sql
-- DEV (projektzeiterfassung20), 11.09.2026 - Ergebnis: 34 Zeilen, 2027-06-01 bis 2027-07-16
UPDATE v7_employee_absences SET is_active = false, updated_at = now()
WHERE employee_id = '4d9651c4-dfa2-4c7e-8430-dbc02929afaa'  -- Schulz, Rainer (AS System)
  AND absence_code = 'E' AND is_active = true
  AND work_date BETWEEN '2027-06-01' AND '2027-07-16';
```

Grund fuer den SQL-Weg: siehe A-066 (Zeitraum lag ausserhalb der Projektlaufzeit).

---

## Code-Integration (Status) - V7.9.10

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| berater-multiprojekt-page-v7_4_8-28.tsx | src/app/v7/berater/multiprojekt/page.tsx | in DEV getestet, aufgegangen in -29 |
| berater-multiprojekt-page-v7_4_8-29.tsx | src/app/v7/berater/multiprojekt/page.tsx | DEPLOYED (V7.9.10) |

ASCII-Check (0 Nicht-ASCII) und Syntaxpruefung je Build; `npm run build` lokal fehlerfrei
fuer -28 und -29.

**Commits dieser Etappe:**

| Commit | Branch | Inhalt |
|---|---|---|
| `94bf6b2` | v7-dev | Kapazitaetsplanung v7.4.8-29: Elternzeit (E) mindert Monatskapazitaet, E-Zelle, Warnung bei verplanten PM (1 Datei, +127/-7) |
| `ec2b101` | main | Merge v7-dev: Kapazitaetsplanung Elternzeit (v7.4.8-29) |

---

## Verifikation (durch Martin bestaetigt)

**DEV (AS System), -28:**

- Ohne E-Daten: Matrix unveraendert, Legende zeigt "E Elternzeit".
- Schulz, Rainer, E 01.06.-16.07.2027 ueber den Bereichsdialog (Vorschau 34 Tage):
  Juni "E" hellblau; Juli 80 h gelb (22 Arbeitstage, 12 E, 10 x 8 h, 80/176 = 45 Prozent);
  Frei h 1520 -> 1248; Frei PM 8.77 -> 7.20. Tooltips Juli (176 / -96 / 80 / 45 Prozent)
  und Juni (176 / -176 / 0 / 0 Prozent, ohne Warnzeile) korrekt.
- Bohlmann, Jens, E 01.-31.01.2027 (Vorschau 21 Tage, 20 Arbeitstage - 06.01. im
  Bundesland kein Feiertag): Januar "E" in roter Schrift; Warnzeile; HEATS
  "geplant: -260.0h"; Frei h 1473 / Frei PM 8.50 unveraendert (Januar war schon 0).
- Entfernen Bohlmann ueber den Dialog: Januar wieder 0 rot. Entfernen Schulz per SQL
  (34 Zeilen): Werte wieder 1520 / 8.77.

**PROD (Flensburger Yacht-Service), -29:**

- Reimers, Kai, April 2026: Monatskapazitaet 160.0 h, Elternzeit 14 Arbeitstage
  -112.0 h, verfuegbar 48.0 h, SmartMarina verbucht 48.0 h, frei 0.0 h (0 Prozent).
  Entspricht der Vorhersage (16 E-Tage 01.-22.04. inkl. Karfreitag und Ostermontag).
- Reimers, Kai, Juli 2026: Monatskapazitaet 184.0 h, Elternzeit 7 Arbeitstage -56.0 h,
  verfuegbar 128.0 h, verbucht 128.0 h. Diese E-Tage im Juli sind im
  KONZEPT-ELTERNZEIT (nur April dokumentiert) nicht erwaehnt - Datenstand in PROD,
  hier nur festgehalten.
- In beiden Monaten decken sich verfuegbar und verbucht auf die Stunde - unabhaengige
  Bestaetigung des Abzugs von der Seite der Zeiterfassung.
- Tooltip-Abstand korrekt.

---

## Beobachtungen (nicht Teil dieser Etappe)

- **DEV, AS System, HEATS:** Bohlmann, Jens, Januar 2027 mit 260 h geplant bei 160 h
  Monatskapazitaet - Arbeitsplan unabhaengig von Elternzeit ueberbucht. Pruefen, ob das
  dem echten Antrag entspricht oder nur Testdaten sind.
- **downloads/ und iCloud:** siehe Session-Auftakt.

---

## Offen / naechste Schritte

- **A-067 FZul-Detailseite** (`/v7/berater/multiprojekt/[id]`, Jahreskalender und
  BSFZ-Export) liest `v7_employee_absences` nicht - weder E noch U/K/S. An Elternzeit-
  und Abwesenheitstagen werden volle FZul-Stunden angeboten und koennen in den Export
  gelangen. **Empfohlener naechster Arbeitspunkt** (Export geht nach aussen).
- **Warnung bei verplanten Arbeitsplan-PM** im E-Zeitraum - in die Vorschau des
  Elternzeit-Dialogs (TimesheetForm). Das rote E der Kapazitaetsplanung zeigt den Fall
  bereits an, verhindert ihn aber nicht.
- **A-066 Elternzeit ausserhalb der Projektlaufzeit** per UI nicht entfernbar -
  Vorschlag: Warnung in der Vorschau bei Zeitraum ueber Projektende; "Entfernen" auch
  an Nicht-E-Tagen anbieten.
- **Anleitungen** (Admin, PL) um das Kapitel Elternzeit ergaenzen.
- **VERHALTENSVERTRAG v1.3** mit den zwei Regeln aus V7.9.9 und einem neuen
  Kapazitaetsplanungs-Vertrag KP-01..04 (Vorschlag in PFLICHTENHEFT-v5_43-AENDERUNGSBLOCK.md).
- **KONZEPT-ELTERNZEIT-TIMESHEET v1.1** (Paragraph 3, 8, 10, 11 fortgeschrieben) - mit
  dieser Etappe erstellt.
- **Veraltetes Interface `V7Timesheet`** in `src/types/v7-types.ts` (Schema
  year/month/daily_data statt work_date/hours/work_package_id).
- **Vereinfachung des Prognose-Modells** - bewusst vertagt.
- Uebernommen aus frueheren Sessions: Restanzeige-Modus "monatsende" mit projektweiter
  Zahl im Zell-Tooltip; automatisierte Stundenvorschlaege; KMU-innovativ PDF-Import;
  Enum-Vereinheitlichung v7_funding_format DEV/PROD; Manuals-Nachzug; Datenhygiene
  Loesch-Kaskade; 'Assistenz GL'-Rolle; A-013 Legacy-Cluster.

---

## Komponenten / Dateien dieser Etappe (deployed src/)

- src/app/v7/berater/multiprojekt/page.tsx (v7.4.8-29)

**DB:** keine Aenderung.

**Git:** `main` = `ec2b101` auf origin und cubintec, Tag `v7.9.10`; `v7-dev` = `94bf6b2`
auf origin.

**Doku:** PFLICHTENHEFT-v5_43-AENDERUNGSBLOCK.md; GIT-SICHERUNG-v7_9_10-session82.md
(diese Datei); KONZEPT-ELTERNZEIT-TIMESHEET-v1_1.md; DEPLOY-PROZESS-PZE.md (unveraendert
gueltig).
