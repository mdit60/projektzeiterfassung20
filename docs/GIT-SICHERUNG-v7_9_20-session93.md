# GIT-SICHERUNG - Session 93 (V7.9.20)

**Datum:** 20./21. Oktober 2026
**SW-Release:** V7.9.20 ("sonstige Arbeiten" ohne Reststunden, VN-Stundensatz identisch
zur ZA) - in PRODUKTION
**Pflichtenheft:** v5.54
**Verhaltensvertrag:** v1.12
**Deploy-Prozess:** v3 (unveraendert)
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_19-session92-2.md

**Deploy-Stand:** zwei fachliche Deploys am 20.10.2026, jeweils Commit auf v7-dev, Merge
in main, Push auf origin und cubintec. Erfolg jeweils von Martin in PROD bestaetigt.
**Kein SQL-Schema, keine Datenkorrektur.**

| # | Merge-Commit main | Inhalt |
|---|---|---|
| 1 | (Hash nicht notiert; per `git log --oneline main`) | "Merge v7-dev: TimesheetForm v7.4.6-103 sonstige Arbeiten ohne Reststunden" |
| 2 | (Hash nicht notiert; per `git log --oneline main`) | "Merge v7-dev: VN-Stundensatz identisch zur ZA" (verwendungsnachweis-utils 1.2-8) |

---

## Ausloeser

1. Martin: Im Stundennachweis werden verbleibende Stunden bis zur Tagesarbeitszeit
   automatisch unter "sonstige Arbeiten" aufgefuellt; dadurch entstehen Werte wie
   0,02 h, die bei Pruefung und Abrechnung Rueckfragen ausloesen. Die aktuellen
   Vorlagen des ZIM-Formularcenters enthalten die Zeile nicht mehr (drei Vorlagen
   uebergeben: FuE-Projekt, Durchfuehrbarkeitsstudie, Netzwerkmanagement).
2. Martin: Bei AURA (OpenZ) fehlen laut AP-Status noch 89 h (MA ausgefallen); trotzdem
   meldet der Verwendungsnachweis, es sei zu viel abgerechnet worden.

## Ausgangslage (Befunde vor den Aenderungen)

- TimesheetForm -102: Auto-Wert je reinem Arbeitstag = min(Tagesarbeitszeit - dieses
  Projekt - andere Projekte, Wochen-Restbudget). Jede Differenz wurde eingetragen, auch
  Bruchteile. Abwesenheitstage wurden bereits geleert (v7.4.6-65).
- Cross-Projekt-Pruefung (A-021, seit v7.4.6-22) ist vorhanden: 9-h-Tagesgrenze ueber alle
  Projekte (hart, sperrt Speichern und Drucken), physische Monatsgrenze, Zellhinweis
  "x h in anderen Projekten". Die noch freien Stunden zeigt sie nicht (A-107).
- VN-Lib 1.2-7: getHourlyRate skalierte den kalkulatorischen Satz mit weekly_hours /
  pm_basis_weekly_hours. Diese Skalierung hatte ZAPanel bereits in v7.4.4-66 entfernt.
  weekly_hours kommt aus v7_employees (ueber loadProjectAssignments), nicht aus
  v7_project_assignments.
- Diagnose AURA per SQL (PROD): zwei Projekte mit Kurzname AURA. OpenZ = Basis 37,5 h
  (Zimmermann, Blanken, Jaeger). Blanken: 30 h, kalkulatorisch 28,00 EUR, kein
  anerkannter Satz -> ZA 28,00, VN 22,40. Alle Zuordnungen aktiv (Deaktivierung als
  Ursache ausgeschlossen).
- VN-Warnung vorher: angefordert 58.505,00 EUR, Anspruch 52.711,58 EUR, Differenz
  +5.793,42 EUR. Nachrechnung 5.793,42 / 0,70 / 1,30 / 5,60 = 1.136,86 h gegen
  1.137,92 h gebucht.

## Umsetzung

### Deploy 1 - "sonstige Arbeiten" ohne Reststunden (A-104)
- TimesheetForm 7.4.6-103: Auto-Wert = 0 bei Stunden in diesem oder einem anderen
  Projekt; auf leeren Tagen volle Tagesarbeitszeit, nur wenn das Wochen-Restbudget
  reicht, sonst 0. Variante A (Entscheidung Martin): an Projekttagen wird die Zelle
  immer geleert, auch Altwerte. Speicher-Hinweis auf "Luecken"-Tage (v7.4.6-63)
  entfernt, da er sonst an jedem Projekttag zum Nachtragen aufgefordert haette.
  Entscheidungen Martin 20.10.2026: (1) andere Projekte -> leer lassen,
  (2) Variante A, (3) keine Dezimalreste auf leeren Tagen.

### Deploy 2 - VN-Stundensatz (A-105)
- verwendungsnachweis-utils 1.2-8: getHourlyRate = hourly_rate_approved ?? hourly_rate,
  unskaliert. Funktion wird nur innerhalb der Lib genutzt (ZAPanel importiert nur
  abrechnungsFenster, istImFenster, roundEuro).

## Code-Integration (Status) - V7.9.20

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| TimesheetForm-v7_4_6-103.tsx | src/components/shared/TimesheetForm.tsx | DEPLOYED |
| verwendungsnachweis-utils-v1_2-8.ts | src/lib/verwendungsnachweis-utils.ts | DEPLOYED |

Je Datei: ASCII-Check (0 Nicht-ASCII-Zeichen), Aenderung per Skript mit Eindeutigkeits-
pruefung jeder Ersetzung (Claude); `npm run build` (Martin).

## Test

- Deploy 1: DEV durch Martin ("funktioniert"): Projekttag ohne "sonstige", leerer
  Arbeitstag mit voller Tagesarbeitszeit. Deploy und PROD bestaetigt ("Das funktioniert
  alles, prima").
- Deploy 2: AURA nur in PROD -> nach dem Deploy in PROD geprueft: Anspruch lt. VN
  58.505,31 EUR = angefordert 58.505,00 EUR, Warnung weg, verbleibend 1.180,69 EUR von
  59.686,00 EUR. Zuschlag technisch 29,88 % / nichttechnisch 30 % ist laut Martin
  korrekt (T und NT bei AURA verschieden).
- Claude hat die Oberflaeche nur per Screenshot gesehen.

## Besonderheiten dieser Session

- Prozessfehler Claude: erneut `npx tsc --noEmit` nach der Integration geliefert -
  entgegen DEPLOY-PROZESS (IF-14), obwohl in Session 92 bereits als Fehler festgehalten.
  Ergebnis: 13 Fehler, alle in downloads/archiv/, keiner in src/. Ursache des Fehlers:
  DEPLOY-PROZESS-PZE.md erst vor dem Deploy gelesen, nicht vor dem ersten Testbefehl.
- Erste Diagnose-Abfrage scheiterte: weekly_hours liegt in v7_employees, nicht in
  v7_project_assignments.
- Zwei Projekte mit Kurzname AURA in PROD; Diagnose-Abfragen muessen nach FKZ oder ID
  filtern, nicht nach short_name.
- Die drei uebergebenen ZIM-Vorlagen tragen den Vermerk "Stand: 09-2020"
  (Netzwerkmanagement ohne Standvermerk). Vor A-106 klaeren, ob das die aktuelle Fassung
  ist.

## Lehren dieser Session

- DEPLOY-PROZESS-PZE.md vor dem ERSTEN Test- oder Build-Befehl lesen, nicht erst vor dem
  Deploy.
- Zwei Kopien derselben Rechenregel (Stundensatz in ZAPanel und VN-Lib) laufen
  auseinander, sobald nur eine korrigiert wird (IF-20).
- Ein Fehlalarm im VN laesst sich gegen die Satzdifferenz nachrechnen; stimmt die
  Rechnung auf die Stunde, ist die Ursache belegt.

## Offen / naechste Schritte

- A-106 Stundennachweis nach neuen ZIM-Vorlagen - eigenes Release, zurueckgestellt;
  Martin meldet sich. Vorab: Altformat sichern, Stichtag, Stand der Vorlagen.
- A-107 Cross-Projekt-Hinweis mit freien Stunden (niedrig).
- A-108 "sonstige Arbeiten" an Projekttagen sichtbar sperren (niedrig).
- A-109 Altwerte "sonstige" in der DB - Entscheidung, haengt an A-106.
- A-080 erweitert (tsconfig exclude downloads).
- Aus Session 92 unveraendert: A-098, A-100, A-091, Etappe 3 / A-090, A-088, A-089.
- OpenZ/AURA: offene 1.180,69 EUR nur ueber tatsaechlich geleistete, noch nicht
  erfasste Stunden innerhalb der Laufzeit (bis 30.09.2026).

## Doku dieser Session

PFLICHTENHEFT-v5_54-AENDERUNGSBLOCK.md; VERHALTENSVERTRAG-v1_12.md;
GIT-SICHERUNG-v7_9_20-session93.md (diese Datei); PZE-Upload-Checkliste-Session93.xlsx;
aufraeumen-session93-v1.zsh.
