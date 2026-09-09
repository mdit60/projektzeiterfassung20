# GIT-SICHERUNG - Session 77 (V7.9.5)

**Datum:** 10. August 2026
**SW-Release:** V7.9.5 (Timesheet-AP-Angebot Startmonat-Filter, AP-Status-Rundungsabgleich,
Projektfortschritt-Prognose auf Planerfuellung umgestellt - in PRODUKTION)
**Pflichtenheft:** v5.38
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_4-session76.md (Timesheet-Restanzeige umschaltbar Monatsende/gesamt).

**Deploy-Stand:** In PROD deployt (durch Martin bestaetigt). KEIN SQL - reine Frontend-
Aenderungen. Drei fachliche Themen, sechs Datei-Builds. Deploy je Thema per Merge
v7-dev -> main (--no-ff), push origin + cubintec, Vercel.

---

## Ziel dieser Etappe

Drei unabhaengige Korrekturen, alle im Projekt AURA (GMM) aufgefallen:

1. **Timesheet-AP-Angebot zeitlich begrenzen.** Einem MA zugeordnete APs wurden ab dem
   ERSTEN Projektmonat im Dropdown/der Vorbelegung angeboten, obwohl sie laut Arbeitsplan
   erst spaeter starten (MA Oezalp: AP 3.3 ab Maerz, AP 3.5 ab August). Das verleitete zu
   Fehlbuchungen in Monaten vor dem Planstart.
2. **AP-Status-Rundung.** In der "Alle AP"-Statusuebersicht zeigten die "gesamt"-Spalten
   0,01h-Reste, die in den MA-Spalten nicht auftauchten (Beispiel AP 3.2: gesamt offen 0,34
   bei MA-Spalten 0,00 + 0,33). Rundungsartefakt aus dem periodischen PM-Faktor.
3. **Projektfortschritt-Prognose irrefuehrend.** Ein Projekt bei 83% Laufzeit / 82% PM /
   86% Kosten wurde als "Ziel gefaehrdet" gemeldet. Ursache: die Hochrechnung mass das
   absolute Monatstempo der letzten 3 Monate und stufte den normalen Projektauslauf als
   Gefaehrdung ein.

---

## Weg zur Loesung

### Thema 1 - Timesheet-AP-Angebot (TimesheetForm v7.4.6-82, -83; deployt: -83)

- **v7.4.6-82:** Neuer monatsgenauer Startmonats-Filter `hasAPStarted(wp)`: ein AP erscheint
  erst ab dem Monat, in dem laut `wp.start_date` sein geplanter Start liegt (Vergleich:
  erster Tag des Startmonats <= Monatsende des gewaehlten Timesheet-Monats). ZUGLEICH die
  bisherige OBERGRENZE (`end_date + 2 Monate >= Monatsende`) in `isAPInAssignedGroup`
  ENTFERNT - Begruendung Martin: ein AP kann laenger dauern als geplant; solange noch
  Stunden offen sind (`planned - booked > 0`), muss er waehlbar bleiben.
- **v7.4.6-83 (Korrektur, deployt):** Der Startmonats-Filter darf NUR fuer die automatisch
  angezeigten "Zugeordnete AP" gelten. Fall MA Fells (ab Maerz ausgeschieden): AP 3.3 war
  fuer 03-05.2026 geplant, wurde aber schon im Februar begonnen, weil das Vorgaenger-AP 3.2
  fertig war. Nach -82 liess sich 3.3 im Februar gar nicht mehr waehlen. Fix: der in -82
  auch in `isAPInWeitereGroup` eingebaute `hasAPStarted`-Check wieder entfernt. Damit gilt:
  "Zugeordnete AP" erst ab Startmonat; "Weitere AP" jederzeit vollstaendig fuer jeden MA
  (fuer vorgezogene/uebernommene APs). Ein noch nicht angelaufener, zugeordneter AP faellt
  automatisch in "Weitere AP" und bleibt dort waehlbar.

### Thema 2 - AP-Status-Rundungsabgleich (ApStatusModal v1.0-11; deployt)

- Die "gesamt"-Werte (geplant/gebucht/offen) je AP-Zeile werden jetzt als Summe der auf 2
  Nachkommastellen GERUNDETEN MA-Werte gebildet (r2 je MA, dann summiert) - genau die Ebene,
  auf der gebucht wird. Damit gilt: gesamt == Summe der MA-Zellen in jeder Zeile UND in der
  Fusszeile; voll gebuchte APs zeigen ueberall 0,00. Fallback auf `total_person_months x
  hoursPerPM` nur noch fuer APs ganz ohne MA-Planwert.
- Ursache des Phantoms: `hoursPerPM(40) = 40*52/12 = 173,3333...` ist periodisch. Die
  vollen Nachkommastellen blieben im aus `total_person_months x hoursPerPM` gerechneten
  gesamt-Wert, waehrend je MA und je Buchung nur 2 Stellen existieren. Reine Anzeige-/
  Aggregationslogik dieses Modals; keine Aenderung an Buchung, Foerdergrenzen oder Daten.

### Thema 3 - Projektfortschritt-Prognose auf Planerfuellung (projektfortschritt-utils v7.4.9-6; FirmaCockpit v7.4.9-36-11; ProjektFortschrittPanel v7.4.5-26; deployt)

- **utils v7.4.9-6 (Kern):** Die Hochrechnung `prognostizierteGesamtStunden` wird nicht mehr
  aus `Ist + Durchschnitt-letzte-3-Monate x Restmonate` gebildet (flaches absolutes Tempo),
  sondern PLAN-BEZOGEN: `Ist(abgeschlossene Monate) + Rest-Soll(aktueller + kuenftige Monate)
  x Erfuellungsgrad`, mit `Erfuellungsgrad = Ist/Soll der bereits abgeschlossenen Monate`
  (gekappt auf [0, 1.15]). Die AP-genaue Soll-Verteilung je Monat (`sollMonatMap`) wird dafuer
  zentral vor der Prognose berechnet und auch vom Monatsverlauf genutzt (vorher dort lokal
  doppelt). Die Prognoselinie im Monatsverlauf-Chart folgt jetzt konsistent dem geplanten
  Soll x Erfuellungsgrad statt der flachen Basis. Neues Rueckgabefeld `erfuellungsgrad`.
  Ampel-Schwellen unveraendert (>=90% gruen, >=60% gelb, sonst rot).
- **FirmaCockpit v7.4.9-36-11 / ProjektFortschrittPanel v7.4.5-26:** Der Prognose-"Basis"-Text
  zeigt jetzt "Plan-Erfuellung XX% (Ist/Soll bis heute)" statt "X h/Monat (letzte 3 Mon.)".
  Reine Label-Aenderung; die Szenarien-Sektion ("Weiter wie bisher") behaelt bewusst den
  3-Monats-Tempo-Hinweis, da sie tatsaechlich das Monatstempo hochrechnet.
- Wirkung fuer AURA: Erfuellungsgrad ~99%, Rest-Soll (Aug+Sep) fliesst voll ein -> Prognose
  ~100% -> GRUEN "Ziel erreichbar" statt "gefaehrdet". Ein real zurueckfallendes Projekt
  (Ist << Soll) bekommt weiterhin korrekt Gelb/Rot.

---

## DB-Aenderung

**Keine.** Alle drei Themen sind reine Frontend-/Anzeige-Aenderungen. Keine Migration.

---

## Code-Integration (Status) - V7.9.5

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| TimesheetForm-v7_4_6-83.tsx | src/components/shared/TimesheetForm.tsx | DEPLOYED |
| ApStatusModal-v1_0-11.tsx | src/components/shared/ApStatusModal.tsx | DEPLOYED |
| projektfortschritt-utils-v7_4_9-6.ts | src/lib/projektfortschritt-utils.ts | DEPLOYED |
| FirmaCockpit-v7_4_9-36-11.tsx | src/components/shared/FirmaCockpit.tsx | DEPLOYED |
| ProjektFortschrittPanel-v7_4_5-26.tsx | src/components/shared/ProjektFortschrittPanel.tsx | DEPLOYED |

TimesheetForm-Zwischenstand -82 ist im Endstand -83 aufgegangen. ASCII-Check (0 Nicht-ASCII)
je Datei erfolgt. Deploy je Thema: Merge v7-dev -> main (--no-ff), push origin + cubintec, Vercel.

---

## Verifikation (durch Martin bestaetigt)

- Thema 1: "Weitere AP" wieder vollstaendig sichtbar; vorgezogenes AP (Fells, 3.3 im Februar)
  waehlbar; noch nicht angelaufene zugeordnete APs (Oezalp, 3.3/3.5) nicht mehr vorzeitig in
  der Zugeordnet-Liste.
- Thema 2: AP-Status-Spalten gehen jetzt spaltenweise auf (kein 0,01-Phantom mehr).
- Thema 3: Prognose fuer AURA zeigt schluessig grün/erreichbar; Modell als "eindeutig klarer
  und logischer" bestaetigt.
- Alle drei in PROD deployt.

---

## Offen / naechste Schritte

- Uebernommen aus frueheren Sessions: optional im Restanzeige-Modus "monatsende" die
  projektweite "gesamt"-Zahl in den Zell-Tooltip legen; automatisierte Stundenvorschlaege
  (Konzept vor Bau); KMU-innovativ PDF-Import; Enum-Vereinheitlichung v7_funding_format
  DEV/PROD; Manuals-Nachzug; Datenhygiene Loesch-Kaskade; 'Assistenz GL'-Rolle; A-013
  Legacy-Cluster.

---

## Komponenten / Dateien dieser Etappe (deployed src/)

- src/components/shared/TimesheetForm.tsx (v7.4.6-83)
- src/components/shared/ApStatusModal.tsx (v1.0-11)
- src/lib/projektfortschritt-utils.ts (v7.4.9-6)
- src/components/shared/FirmaCockpit.tsx (v7.4.9-36-11)
- src/components/shared/ProjektFortschrittPanel.tsx (v7.4.5-26)

**DB:** keine Aenderung.

**Doku:** PFLICHTENHEFT-v5_38-AENDERUNGSBLOCK.md; GIT-SICHERUNG-v7_9_5-session77.md (diese
Datei); DEPLOY-PROZESS-PZE.md (unveraendert gueltig: main auf origin + cubintec).
