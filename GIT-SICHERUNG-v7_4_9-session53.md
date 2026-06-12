# GIT-SICHERUNG - Session 53

**Datum:** 11. Juni 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v5.04
**Branch:** v7-dev -> main (deployed, beide Remotes gepusht)

---

## Zusammenfassung

Zwei neue Funktionen plus zwei Bugfixes. NEU: Sammeldruck der Stundennachweise
(A-029) - die Stundennachweis-Matrix wird per Umschalt-Knopf zur Auswahlflaeche,
und mehrere Nachweise lassen sich in einem Druck/PDF zusammenfassen. NEU: ein
"Meine Arbeitspakete"-Popup in der Zeiterfassung (A-030), das die dem aktuellen
Mitarbeiter zugeordneten APs ohne Umweg ueber den Arbeitsplan zeigt. BUGFIX 5.57:
ueberhoehte ZA-Stunden durch doppelte Timesheet-Zeilen (Doppel-Speichern) - PROD
per Cleanup bereinigt und TimesheetForm gegen Doppel-Speichern gehaertet. BUGFIX
5.58: Phantom-"Verschenkt" und Prognose ueber Plan in der Foerder-Prognose.
Keine DB-Migration (nur einmaliges Daten-Cleanup doppelter Zeilen).

---

## Erledigte Anforderungen

### A-029 - Sammeldruck der Stundennachweise
- **Dateien:**
  - `src/components/shared/StundennachweisMatrix.tsx` -> **v7.4.6-3**
  - `src/components/shared/StundennachweisSheet.tsx` -> **v1.0.0 (NEU)**
  - `src/lib/stundennachweisSheetData.ts` -> **v1.0.0 (NEU)**
- Bedarf: Bisher liess sich jeder Stundennachweis nur einzeln aus der TimesheetForm
  drucken. Gewuenscht: mehrere Nachweise (MA x Monat) in einem Rutsch als PDF.
- Loesung: Knopf "Sammeldruck" schaltet die Matrix in einen Auswahlmodus. Klick auf
  eine Monatsspalte waehlt den Monat fuer alle MA, Klick auf einen MA-Namen die ganze
  Zeile, Klick auf eine Zelle einzeln, Eck-Feld = alles/nichts. "Drucken (n)" laedt
  die Detaildaten der Auswahl selbst nach (Company, Work Packages, Employees,
  Timesheets), baut je Auswahl ein Blatt und ruft `window.print` auf.
- Architektur: Das Nachweis-Layout wurde EINMAL als reine Anzeige-Komponente
  (`StundennachweisSheet`, 1:1 zum Einzeldruck) nachgebaut, gespeist aus einem reinen
  Builder (`stundennachweisSheetData`, Spiegelung der Lade-Logik der TimesheetForm).
  Damit muss die grosse, frisch gehaertete TimesheetForm NICHT angefasst werden und es
  werden nicht N schwere Formulare gleichzeitig gemountet.
- Druck-Isolation: Im Druck landen nur die Blaetter - per CSS-Trick wird waehrend des
  Drucks alles ausser `#snw-print-root` ausgeblendet. Dieser Style wird nur eingehaengt,
  solange Blaetter aktiv sind (sonst wuerde ein manuelles Strg+P leer drucken). Dadurch
  bleiben die einbindenden Seiten (cockpit-stundennachweis, BerichtePage) UNVERAENDERT.
- Hinweis: AP-Zeilen werden im Sammeldruck deterministisch nach AP-Code sortiert; die
  Gesamtsummen-Zelle wird in normalem Gruen dargestellt (kein Ueberschreitungs-Rot, da
  gespeicherte Daten die Speicher-Sperren bereits durchlaufen haben).

### A-030 - "Meine Arbeitspakete"-Popup in der Zeiterfassung
- **Datei:** `src/components/shared/TimesheetForm.tsx` -> **v7.4.6-30**
- Bedarf: Aus der Zeiterfassung heraus sehen, welche APs dem aktuellen MA im
  Arbeitsplan zugeordnet sind - ohne mehrere Klicks in den Arbeitsplan.
- Loesung: Knopf "Meine Arbeitspakete (n)" neben der MA-Auswahl oeffnet ein Modal mit
  den zugeordneten APs: AP-Code, Bezeichnung, bei Durchfuehrbarkeitsstudien T/NT,
  geplante und noch offene Stunden (gruen = Rest, rot = ueberzogen). Reine Anzeige ueber
  vorhandene Bausteine (`assignedWPIds`, `plannedHoursPerWP`, `calculateRemainingHours`).
  Bestehende Logik unveraendert; das bestehende A-003-Info-Icon (alle Projekt-APs) bleibt.

---

## Bugfixes

### 5.57 - ZA-Stundeninflation durch doppelte Timesheet-Zeilen
- **Datei:** `src/components/shared/TimesheetForm.tsx` -> **v7.4.6-26** (Haertung)
- Symptom: In einer ZA (WerftScan, Luebeck Yacht) zeigte ein MA 210 statt 108 h.
- Ursache: KEINE Klassifizierungs-Fehler - die ZA-Logik war korrekt. 210 = 108 echt +
  102 doppelt. In PROD lagen doppelte aktive Timesheet-Zeilen (`data_source='manual'`),
  entstanden durch Doppel-Klick auf "Speichern": `handleSave` hatte kein `setSaving(true)`
  am Anfang -> der Button blieb aktiv -> zwei parallele Saves -> alle Zeilen erneut INSERT.
- Fix Daten: Backup-Tabelle `v7_timesheets_backup_20260611` (mit RLS) angelegt, dann
  exakt die 19 aktiven Duplikate (Lutz/WerftScan Oktober) per De-Dup-DELETE entfernt
  (frueheste `created_at` je Natural-Key behalten, nur `is_active=true`). ZA-Summe danach
  identisch zum handschriftlichen PDF.
- Fix Code: `savingRef` (Re-Entrancy-Guard) + `setSaving(true)` am Anfang von `handleSave`
  + Save-Time-Backstop. Verhindert kuenftige Doppel-Inserts.
- Backup-Tabelle kann nach einigen Tagen Beobachtung geloescht werden.
- Rest-Hinweis (kein Code, kein finanzieller Effekt): Im handschriftlichen PDF des Kunden
  waren alle Tage als "technisch" eingetragen; PZE klassifiziert AP1 (Recherche) korrekt
  als nicht-technisch. Gleicher Foerdersatz (70%) in beiden Spalten -> reine Darstellung.
  E-Mail-Entwurf an Till Schulze-Hagenest dazu erstellt.

### 5.58 - Foerder-Prognose: Phantom-"Verschenkt" + Prognose ueber Plan
- **Dateien:**
  - `src/lib/projektfortschritt-utils.ts` -> **v7.4.9-2**
  - `src/components/shared/ProjektFortschrittPanel.tsx` -> **v7.4.5-24**
  - `src/components/shared/FirmaCockpit.tsx` -> **v7.4.9-33**
- Symptom: Bei 100% Plan erschien "Verschenkt: 6 EUR"; "Prognose gesamt" projizierte mehr
  Stunden als der Plan (fuer die Abrechnung sinnlos).
- Fix: `foerderMaximum = min(bewilligteSumme, Plankosten x Foerdersatz)` (raeumt die
  Rundungsdifferenz aus); neue Felder `prognoseStundenAbrechenbar` (auf Plan gekappt) und
  `tempoUeberPlan`; Panel/Cockpit zeigen den gekappten Wert + Hinweis "Tempo ueber Plan".

### PortalHeader v7.3.95-14
- `dashboardHref` im Berater-App-Modus zeigt jetzt auf das App-Cockpit
  (`/v7/berater/app/cockpit`) statt auf das alte Dashboard.

---

## Geaenderte/neue Dateien (Deploy-Reihenfolge)

1. `src/lib/projektfortschritt-utils.ts` (v7.4.9-2)
2. `src/components/shared/ProjektFortschrittPanel.tsx` (v7.4.5-24)
3. `src/components/shared/FirmaCockpit.tsx` (v7.4.9-33)
4. `src/components/shared/PortalHeader.tsx` (v7.3.95-14)
5. `src/components/shared/TimesheetForm.tsx` (v7.4.6-26 .. v7.4.6-30)
6. `src/lib/stundennachweisSheetData.ts` (v1.0.0, NEU)
7. `src/components/shared/StundennachweisSheet.tsx` (v1.0.0, NEU)
8. `src/components/shared/StundennachweisMatrix.tsx` (v7.4.6-3)

---

## Deploy-Notiz (Vercel)

Das Production-Vercel-Projekt baut nur den Branch `main`. Ein Push auf `v7-dev` erzeugt
in dieser Konfiguration KEIN Preview-Deployment. Schritt 3 des Deploys lautet daher: nach
`merge v7-dev -> main` + Push auf beide Remotes den **Production-Build gruen** werden lassen.
Schlaegt ein Build fehl, bleibt das letzte funktionierende Deployment live (Production geht
nicht kaputt). PROD-Deploy weiterhin IMMER auf beide Remotes (origin + cubintec) pushen.
