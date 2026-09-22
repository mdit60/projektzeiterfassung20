# VERHALTENSVERTRAG - Kritische Komponenten

**Version 1.8 - fortgeschrieben in Session 89 (22.09.2026)**
**Datum:** 22. September 2026
**Loest ab:** VERHALTENSVERTRAG-v1_7.md (Session 88, 21.09.2026)
**Ziel:** Sicherstellen, dass bei Code-Aenderungen keine bestehenden Funktionen brechen

> **VERBINDLICHE QUELLE:** Der Inhalt dieses Vertrags ist seit Session 47 verbindlich
> im Pflichtenheft als Paragraph 12e gepflegt (eine Quelle der Wahrheit). Aenderungen
> am Vertrag erfolgen dort; die Aenderungen der Version 1.3 stehen im
> PFLICHTENHEFT-v5_45-AENDERUNGSBLOCK.md, die der Version 1.4 im
> PFLICHTENHEFT-v5_46-AENDERUNGSBLOCK.md, die der Version 1.5 im
> PFLICHTENHEFT-v5_47-AENDERUNGSBLOCK.md, die der Version 1.6 im
> PFLICHTENHEFT-v5_48-AENDERUNGSBLOCK.md, die der Version 1.7 im
> PFLICHTENHEFT-v5_49-AENDERUNGSBLOCK.md, die der Version 1.8 im
> PFLICHTENHEFT-v5_50-AENDERUNGSBLOCK.md. Dieses Dokument ist die kompakte
> Arbeitskopie.

**Versionshinweis:** Versionsnummern der Komponenten sind bewusst NICHT eingebacken.
Die Funktions-Checklisten sind versionsunabhaengig. Die jeweils aktuelle Datei-Version
ist immer dem Projektverzeichnis zu entnehmen.

**Neu in v1.8 (Kurzuebersicht):** Betragseingabe nur mit Komma als Dezimaltrenner,
Punkte ignoriert (ZA-04). Neu ZA-17: Rueckfragen vor Aenderung eingereichter ZA.
Fragiler Bereich openPanel: Laufnummer, kein await zwischen Liste und Vorbelegung.

**Neu in v1.7 (Kurzuebersicht):** Zahlungseingaenge als Liste aus v7_za_zahlungen
(ZA-04, VN-04, FC-04, IF-15). Sammelueberweisung (ZA-15). Zahlungen nur bei
eingereichten ZA (ZA-16). Eine Zahlung aendert NIE den angeforderten Betrag (ZA-05
korrigiert). Archiv als Uebersicht oben rechts in der ZA-Auswahl (ZA-03). Loeschen
eingereichter ZA nur mit Eingabe der ZA-Nummer (ZA-07).

**Neu in v1.6 (Kurzuebersicht):** KORREKTUR der Rundung: die angeforderte Zuwendung
je ZA wird wieder kaufmaennisch auf GANZE EURO gerundet (ZA-14, IF-13) - wie im
Originalformular. Kosten und Verwendungsnachweis bleiben centgenau. VN-05 Toleranz
angepasst. Neu VN-08: Berichtszeitraum fest aus der Projektlaufzeit. Der Zeitraumfilter
nimmt jede ZA auf, die den Berichtszeitraum beruehrt (kein stiller Wegfall mehr).

**Neu in v1.5 (Kurzuebersicht):** Abrechnungsgrenzen taggenau statt monatsweise und
hart auf den Bewilligungszeitraum gekappt (ZA-13, IF-12). Foerderbetrag centgenau (ZA-14,
IF-13). TF-16: Projektstunden ausserhalb des Bewilligungszeitraums gesperrt - nur die
AP-Zeilen, nicht der Tag. FC-04 um Abrechnungszeitraum und Vollstaendigkeitspruefung
erweitert. Neuer Abschnitt 6a Verwendungsnachweis (VN-01..07).

**Neu in v1.4 (Kurzuebersicht):** Monatsstatus neu definiert (MS-01..05, gilt fuer
Stundennachweis-Matrix und Mein Status): Abgeschlossen nur per Button, Hellgruen
"Erfasst", laufender Monat nie automatisch, nur Netto-Werktage, zentrale Abwesenheiten.
TF-08 um "Abschluss speichert immer" ergaenzt. BP-03 angepasst.

**Neu in v1.3 (Kurzuebersicht):** Abschnitt 8 Kapazitaetsplanung (KP-01..04),
Abschnitt 9 FZul-Detailseite und BSFZ-Export (FD-01..08, mit bekannten Luecken A-070
und A-071), PF-09 (gemeinsamer Bezugsrahmen der Foerderkennzahlen), IF-09 bis IF-11,
je ein fragiler Bereich bei TimesheetForm und FirmaCockpit.

---

## 1. Grundprinzip

Jede kritische Komponente hat einen **Verhaltensvertrag**: eine Liste von Funktionen
die IMMER korrekt arbeiten muessen. Vor jeder Aenderung wird diese Liste gemeinsam
durchgegangen. Nach der Aenderung wird sie als Smoke-Test abgearbeitet.

**Ablauf bei jeder Code-Aenderung:**

```
1. Martin beschreibt Anforderung/Problem
2. Claude identifiziert betroffene Datei(en)
3. Claude prueft Verhaltensvertrag der betroffenen Komponente(n)
4. Claude praesentiert Plan + explizite Liste:
   "Diese Verhaltensweisen bleiben intakt: [Liste]"
5. Martin gibt GO
6. Claude implementiert (chirurgisch, nur betroffene Zeilen)
7. Smoke-Test auf DEV (localhost:3000) gegen Verhaltensvertrag
8. Erst nach erfolgreichem DEV-Test: Deploy auf PROD
```

---

## 2. Verhaltensvertrag: TimesheetForm

**Datei:** src/components/shared/TimesheetForm.tsx
**Genutzt in:** Berater-Portal + Firma-Portal (Zeiterfassung)

### Funktionen die IMMER korrekt arbeiten muessen:

| Nr | Funktion | Pruefung |
|----|----------|----------|
| TF-01 | AP-Auswahl per Dropdown | Zugeordnete + Weitere AP sichtbar, sortiert nach ap_code |
| TF-02 | Stundeneingabe in Tageszellen | Wert eingeben, Tab/Enter/Pfeiltasten navigieren |
| TF-03 | Speichern + Laden | Speichern, Seite neu laden, Werte identisch |
| TF-04 | Feiertage in S-Zeile | Werktags-Feiertage automatisch mit Tagesstunden vorbelegt. **Ausnahme (v1.2): an Elternzeit-Tagen (Code E) KEINE Vorbelegung** - ohne Entgeltfortzahlung keine bezahlten Feiertagsstunden |
| TF-05 | Fehlzeiten U/K/S editierbar | Tageszellen frei editierbar, Summen korrekt. **Ausnahme (v1.2): an Elternzeit-Tagen (Code E) ist in den Zeilen U, K und S bewusst KEIN Eingabefeld vorhanden** (ein Tag ist entweder Elternzeit oder Fehlzeit); die Zelle ist hellblau und traegt einen Hinweistext |
| TF-06 | Wochenende/Feiertag Hintergrund | Sa/So grau, Feiertage orange |
| TF-07 | Summenberechnung | Zeilensumme (S), Tagessumme, Gesamtsumme korrekt. E-Tage tragen 0 Stunden und erscheinen in keiner Stundensumme |
| TF-08 | Monatsabschluss | Button setzt/entfernt Completion-Flag. **Neu (v1.4): vor dem Setzen wird IMMER gespeichert (auch ohne manuelle Aenderung), damit die Auto-Vorbelegung "sonstige Arbeiten" (TF-12) in der DB steht. Ein abgeschlossener Monat fuehrt keine Auto-Vorbelegung mehr aus** |
| TF-09 | Arbeitszeitgrenzen | Tagesgrenze 9h (hart), Monatsgrenze (weich), Zellfaerbung. Massgebliche Wochenarbeitszeit: Teilzeit-Historie -> v7_employees.weekly_hours -> Firmenstandard; die projektbezogene pWAZ ist KEINE Quelle (v1.2) |
| TF-10 | Kumulierte Stunden (Arbeitsplan) | offen-Spalte zeigt verbleibende Stunden pro AP |
| TF-11 | Druck/PDF | AP-Name vollstaendig, AP-Nummer sichtbar, Layout A4 Querformat |
| TF-12 | Nicht-zuschussfaehige Arbeiten | Sonstige-Zeile editierbar, nicht in Summe (2). **Neu (v1.2): an einem reinen Arbeitstag ist der Wert IMMER die Differenz aus Tagesarbeitszeit und gebuchten Stunden (Tages- und Wochendeckel) und folgt jeder Aenderung der Projektstunden - er wird nicht eingefroren.** Wochenenden, Feiertage, gesperrte Tage, Kurzarbeit und Abwesenheitstage bleiben von der Auto-Vorbelegung unberuehrt; dort eingetragene Werte bleiben erhalten |
| TF-13 | Durchfuehrbarkeitsstudie (DS) | T/NT-Spalte bei ZIM_DS-Projekten |
| TF-14 | Mehrere AP-Zeilen | Dynamisches Hinzufuegen, max. 4 initial |
| TF-15 | **Elternzeit (Code E), neu in v1.2** | E-Tage werden angezeigt (eigene Zeile mit Tageszahl), sperren den Tag vollstaendig (Projekt, sonstige, U/K/S) und ueberleben jedes Speichern des Monats. Erfassung und Ruecknahme ausschliesslich ueber den Bereichsdialog (Rechtsklick oder Eingabe "E"), nur fuer Berater und Firmen-Administrator. Der Monats-Abgleich beim Speichern darf E-Zeilen NIE deaktivieren |
| TF-16 | **Projektstunden nur im Bewilligungszeitraum, neu in v1.5** | Tage vor Beginn bzw. nach Ende des erlaubten Zeitraums (Minimum aus employment_end, assignment_end, project.end_date; symmetrisch fuer den Beginn) sind in den **AP-Zeilen** grau und nicht bebuchbar, mit Tooltip. Die Grenze ist TAGGENAU (dayLimits/isProjectDayAllowed), nicht monatsweise. Der Monat behaelt seine volle Spaltenzahl. **Bewusst offen bleiben** die Zeile "sonstige Arbeiten", Fehlzeiten U/K/S, Rechtsklick-Menue und Auto-Vorbelegung: der Stundennachweis ist ein Monatsnachweis der gesamten Arbeitszeit. Bereits erfasste Projektstunden ausserhalb bleiben sichtbar und werden beim Speichern nicht geloescht |

### Besonders fragile Bereiche (erhoehte Vorsicht):

- **loadTimeEntries-Funktion:** Laed AP-Eintraege, Fehlzeiten, Feiertage, sonstige Arbeiten
  und (ab V7.9.7) Elternzeit-Tage. Aenderungen hier koennen TF-01 bis TF-07 und TF-15
  gleichzeitig brechen.
- **Monats-Abgleich der Abwesenheiten beim Speichern:** Deaktiviert jede aktive Zeile des
  Monats, die nicht im Soll-Stand steht. Der Soll-Stand kennt nur U/K/S - die Ist-Abfrage
  MUSS deshalb auf `absence_code IN ('U','K','S')` gefiltert bleiben, sonst verschwinden
  Elternzeit-Zeitraeume beim naechsten Speichern (TF-15).
- **Auto-Vorbelegung setzt hasChanges nicht (neu v1.4):** Die vorbelegten Werte stehen
  nur im State, "Speichern" bleibt grau. Wer den Speicherzwang vor dem Abschluss (TF-08)
  wieder an hasChanges koppelt, erzeugt erneut leer abgeschlossene Monate (Fall
  Duehrkop/AURA Juli 2026, Session 85).
- **Auto-Vorbelegung "sonstige Arbeiten":** Tages- UND Wochendeckel. Wer hier eine zweite
  Berechnungsformel einfuehrt (z.B. beim Laden), erzeugt Divergenzen - genau das war die
  Ursache des Einfrierens vor V7.9.7 (TF-12).
- **Wirkung der Auto-Vorbelegung nach aussen (neu v1.3):** Die vorbelegten Zeilen (ohne
  AP, `is_billable = false`) stehen in jedem Foerderprojekt an jedem gespeicherten
  Arbeitstag. Jede Auswertung ausserhalb des TimesheetForm, die "gefoerderte" Stunden
  zaehlt, muss auf `is_billable = true` filtern (IF-10; Ursache von A-068).
- **Print-Styles (@media print):** Aenderungen an Screen-CSS koennen Print-Layout zerstoeren.
  IMMER Druckvorschau pruefen nach CSS-Aenderungen.
- **pointer-events auf gesperrten Zellen:** Ein disabled-Input ohne `pointer-events-none`
  verschluckt den Rechtsklick; das Kontextmenue ist dann nicht erreichbar.
- **useEffect-Dependencies:** Fehlende Dependencies = veraltete Daten. Zu viele = Endlos-Loop.
- **Reichweite der Sperre TF-16 (neu v1.5):** Gesperrt wird die Erfassung FOERDERBARER
  Projektstunden, nicht der Tag. Ein erster Entwurf (-99, verworfen) sperrte auch die Zeile
  "sonstige Arbeiten", U/K/S und die Auto-Vorbelegung - fachlich falsch: wer am 31.08.
  gearbeitet hat, aber nicht mehr am Projekt, gehoert mit nicht foerderbarer Zeit in den
  Monatsnachweis. Die Tastaturnavigation ueberspringt gesperrte Tage nur bei
  `type === 'ap'`.
- **Speichern schreibt den ganzen Monat neu (neu v1.5):** handleSave aktualisiert JEDE
  Buchung des Monats (neues updated_at) und deaktiviert alles, was im Formular nicht mehr
  steht. Folge: updated_at ist als Beweismittel fuer Aenderungen weitgehend wertlos (Fall
  ANOVIA 19.09.2026, rund 80 Zeilen in 31 Sekunden). Wer die Lade- oder Loeschabfrage auf
  ein kleineres Fenster kappt als die Anzeige, loescht Daten stillschweigend.
- **Leeren von Projektstunden loest die Auto-Vorbelegung aus (neu v1.5):** Wird an einem
  reinen Arbeitstag eine Projektbuchung geleert, fuellt TF-12 den Tag sofort mit "sonstigen
  Arbeiten" bis zur Tagesarbeitszeit auf. Das ist korrekt, ueberrascht aber bei
  Bereinigungen (ANOVIA 31.08.2026: 8,0 / 6,0 / 2,4 h nach dem Loeschen).

---

## 3. Verhaltensvertrag: BerichtePage

**Datei:** src/components/shared/BerichtePage.tsx
**Genutzt in:** Berater-Portal + Firma-Portal (Dashboard/Berichte)

| Nr | Funktion | Pruefung |
|----|----------|----------|
| BP-01 | Zeiterfassungs-Status Tabelle | Erfasst(h) pro MA identisch mit Arbeitsplan "davon erfasst" |
| BP-02 | ProjektFortschrittPanel | Monatsverlauf-Chart: alle Monate vollstaendig, Ist-Balken plausibel |
| BP-03 | Stundennachweis-Matrix | Monatsstatus gemaess MS-01..05 (Abschnitt 4a): dunkelgruen=abgeschlossen, hellgruen=erfasst, orange=teilweise, rot=fehlt, grau=Zukunft/ausserhalb |
| BP-04 | Timesheet-Daten vollstaendig | Alle Eintraege geladen (.limit(10000), keine Abschneidung) |
| BP-05 | Projekt-Auswahl | Dropdown filtert korrekt auf ausgewaehltes Projekt |
| BP-06 | MA-Stundensaetze | Korrekte Berechnung aus Gehaltsdaten (Anlage 6.1); Nenner ist die pWAZ des Projekts, NICHT der MA-Stammsatz (v1.2) |
| BP-07 | Excel-Export | Vollstaendige Daten, korrekte Formatierung |
| BP-08 | Meine Projekte (Firma) | Klickbare Projektliste im Dashboard |

### Besonders fragile Bereiche:

- **Timesheet-Query:** Muss .limit(10000) haben UND Supabase Max Rows >= 10000.
- **timesheets State:** Wird an ProjektFortschrittPanel, ZE-Status und Matrix weitergereicht.

---

## 4. Verhaltensvertrag: FirmaCockpit

**Datei:** src/components/shared/FirmaCockpit.tsx

| Nr | Funktion | Pruefung |
|----|----------|----------|
| FC-01 | Firmendaten-Anzeige | Name, Kontakt, Bundesland korrekt |
| FC-02 | Projektliste | Alle aktiven Projekte mit Laufzeit, PM%, Kosten% |
| FC-03 | Monatsverlauf-Chart | Identisch mit BerichtePage (gleiche Datenquelle) |
| FC-04 | Zahlungsanforderungen | ZA-Liste mit Abrechnungszeitraum (neu v1.5, TT.MM.JJ-TT.MM.JJ), Betraegen, Einreichdatum. Darunter Vollstaendigkeitspruefung (neu v1.5): Luecken, Ueberlappungen, Nummernspruenge, fehlende Zeitraeume, nicht abgedeckter Projektbeginn/-ende - nur sichtbar, wenn es Befunde gibt. Spaltenaufteilung 2/5/5. **v1.7:** Betrag = Summe der Zahlungen aus v7_za_zahlungen je ZA-Nummer, Zahlung = juengstes Datum; bei mehreren Zahlungen oder Sammelueberweisungs-Anteil "(n)" und Popup mit Einzelzahlungen. Kopf der Karte: "+ Neue ZA \| Archiv" (Archiv oeffnet die ZA-Seite mit ?tab=archiv). Kommentar-Popup (16 px) |
| FC-05 | Mitarbeiter-Modal | Neuer MA, MA bearbeiten, PW-Reset |
| FC-06 | Navigation | PortalNav korrekt, returnTo funktioniert |
| FC-07 | Timesheet-Daten vollstaendig | .limit(10000), keine Abschneidung |

### Besonders fragile Bereiche (neu v1.3):

- **Eigene Kopie des Monatsverlaufs:** Das Cockpit bindet das Diagramm NICHT aus dem
  ProjektFortschrittPanel ein, sondern haelt eine eigene Implementierung. Jede Aenderung
  am Monatsverlauf ist in beiden Dateien vorzunehmen (IF-09). In V7.9.9 wurde die
  Cockpit-Kopie zunaechst uebersehen und zeigte weiter die alten Linien (A-064).

---

## 4a. Monatsstatus: Stundennachweis-Matrix und Mein Status (neu in v1.4)

**Dateien:**
- src/components/shared/StundennachweisMatrix.tsx
- src/app/v7/firma/mein-status/page.tsx

Beide Dateien halten die Statuslogik je in einer eigenen Kopie. Jede Aenderung ist in
BEIDEN vorzunehmen.

| Nr | Funktion | Pruefung |
|----|----------|----------|
| MS-01 | Abgeschlossen | Dunkelgruen NUR bei Eintrag in v7_timesheet_completions (Button "Monat abschliessen"). Keine automatische Wertung erzeugt diesen Status |
| MS-02 | Erfasst | Hellgruen, wenn Monat vergangen UND alle Netto-Werktage einen Eintrag haben UND foerderbare Stunden (is_billable = true) > 0. Nur "sonstige Arbeiten" ohne foerderbare Stunden -> orange |
| MS-03 | Laufender Monat | Wird nie automatisch gruen oder hellgruen (vorbelegte Tage bis Monatsende). Orange bei Eintraegen, rot ohne |
| MS-04 | Tagesabdeckung | Gezaehlt werden nur Tage Mo-Fr ohne Feiertag mit Eintrag > 0; Vergleich gegen Netto-Werktage. Feiertage werden NICHT zusaetzlich addiert. Wochenend-/Feiertagseintraege gleichen keine Luecke aus |
| MS-05 | Abwesenheiten | Zentrale Abwesenheiten (v7_employee_absences ueber loadEmployeeAbsencesAsTimesheets, Zuordnungsfenster des Projekts) zaehlen fuer Tagesabdeckung und Stundensumme mit; die angezeigte Zahl (Matrix) bleibt foerderbare Stunden |

### Besonders fragile Bereiche:

- **Zwei Kopien der Statuslogik** (Matrix und Mein Status); Mein Status hat zudem eine
  eigene Feiertagsfunktion ohne holiday_region.
- **Soll-Arbeitstage sind netto:** countWorkdaysInMonth bzw. getWorkingDaysInMonth
  ziehen Feiertage bereits ab (Ursache des Doppelzaehlens vor V7.9.12).
- **Sammeldruck** der Matrix laedt Abwesenheiten separat; nicht mit dem Status-State
  vermischen.

---

## 5. Verhaltensvertrag: ProjektFortschrittPanel

**Datei:** src/components/shared/ProjektFortschrittPanel.tsx

| Nr | Funktion | Pruefung |
|----|----------|----------|
| PF-01 | Laufzeit/PM/Kosten KPIs | Prozent und Absolutwerte korrekt |
| PF-02 | Monatsverlauf-Chart | Ist vs. Soll pro Monat, kumulierte Linien |
| PF-03 | Prognose | Gestrichelte Linie basierend auf letzten 3 Monaten |
| PF-04 | Zielerreichungs-Prognose | Erreichbar/Gefaehrdet/Kritisch korrekt berechnet |
| PF-05 | PM je Mitarbeiter (Plan vs. Ist) | Balkendiagramm pro MA |
| PF-06 | Personalkosten je MA | Balkendiagramm basierend auf Stundensaetzen |
| PF-07 | Drucken/PDF | Chart + KPIs auf einer A4-Seite |
| PF-08 | NWM-Jahresselektor | Dropdown "Netzwerkjahr" bei ZIM_NETZWERK; Fortschritt und Prognose auf den gewaehlten Foerderzeitraum eingeschraenkt; "Gesamtverlauf" = bisheriges Verhalten |
| PF-09 | **Gemeinsamer Bezugsrahmen der Foerderkennzahlen, neu in v1.3** | Kennzahlen, die gegeneinander gelesen werden (Erreichungsgrad in Prozent, Verschenkt in EUR), haben denselben Massstab. "Verschenkt" misst gegen das bei voller Planerfuellung Abrufbare (min(Plankosten x Foerdersatz, bewilligte Summe)); bei 100 Prozent Erreichungsgrad ist Verschenkt 0 EUR. Eine Differenz zwischen Bewilligung und Arbeitsplan erscheint nur im Block "Planungsluecke im Arbeitsplan" (A-063) |

### Hinweis (Refactor projektfortschritt-utils, Session 47 Punkt 3):

PF-02, PF-03 und PF-04 muessen nach einem Refactor rechnerisch bit-genau identische
Ergebnisse liefern. Vergleichswerte vorher festhalten.

### Hinweis (neu v1.3):

Die Diagramm-Implementierung existiert ein zweites Mal im FirmaCockpit (Abschnitt 4,
IF-09). Ein Deckel oder Massstab, der nur in einer von zwei gegeneinander gelesenen
Groessen wirkt, erzeugt fachlich nicht aufloesbare Widersprueche (PF-09).

---

## 6. Verhaltensvertrag: ZAPanel (Zahlungsanforderung)

**Datei:** src/components/shared/ZAPanel.tsx

| Nr | Funktion | Pruefung |
|----|----------|----------|
| ZA-01 | Status-Automatik | Status per calcStatus aus Datumsfeldern; keine manuellen Status-Buttons |
| ZA-02 | Einreichdatum editierbar | eingereicht_am editierbar; Setzen schaltet Status auf Eingereicht |
| ZA-03 | Seiten und Archiv (v1.7) | Seiten einer ZA: Deckblatt / Anlage 1a / Anlage 1b. Archiv = Uebersicht aller ZA, oben rechts in der Reihe "ZA 1 \| ... \| + Neue ZA \| Archiv", hervorgehoben wenn offen; Klick auf ZA, "+ Neue ZA" oder Seite fuehrt zurueck. Drucken nur fuer eine ZA. initialTab 'archiv' aus der ZASeite |
| ZA-04 | Zahlungseingaenge (v1.7) | Quelle v7_za_zahlungen, Zahlung haengt an (project_id, za_nummer). Standard: eine Zahlung in der Archivzeile (Datum + Betrag > 0), leeren + Sichern entfernt sie weich. "+ weitere Zahlung" oeffnet die Liste; ab 2 Zahlungen Summe "(n)" und juengstes Datum. Betragseingabe per parseBetrag (v1.8: Punkte werden immer ignoriert, nur das Komma trennt Dezimalen; "35.235" = 35.235,00). Gespeicherte Betraege im Feld als Waehrung ("55.329,00"). Anmerkung per Popup lesbar |
| ZA-05 | Foerderbetrag-Persistenz (korrigiert v1.7) | Beim Sichern einer Zahlung wird foerderbetrag_gesamt NUR gespeichert, wenn er leer ist. Ein gespeicherter Betrag bleibt unveraendert und ist Massstab fuer calcStatus. Neu berechnet wird er nur bewusst ueber "ZA speichern" im Deckblatt |
| ZA-06 | Historische Werte | Archiv zeigt gespeicherten Foerderbetrag, keine Neuberechnung |
| ZA-07 | ZA loeschen (v1.7) | Nur im Archiv. Eingereichte ZA nur nach Eingabe der ZA-Nummer (window.prompt), Entwurf mit einfacher Rueckfrage. Zahlungen der Nummer werden deaktiviert, wenn keine weitere Zeile dieser Nummer bleibt |
| ZA-08 | Status-Rollback | "Zurueck zu Eingereicht" und "Zurueck zu Entwurf" verfuegbar |
| ZA-09 | Netzwerk-Modus | isNetzwerk bei ZIM_NETZWERK; NWM-Kostenfelder; Laufzeitjahr aus bewilligung_datum |
| ZA-10 | DB-Felder ohne Props (Option B) | bewilligung_datum, bewilligte_summe direkt aus DB (ProjectDetailPage frozen) |
| ZA-11 | Status-Badge-Farben | grau=Entwurf, blau=Eingereicht, gruen=Bewilligt/Zahlung |
| ZA-12 | FZ-basierte Foerderquote (NWM) | Foerderquote aus v7_nwm_foerderzeitraeume (Abgleich zeitraum_bis), Badge "aus FZ-Tabelle"/"Fallback"; bei FZ-Grenzueberschreitung rote Meldung und Speichersperre |
| ZA-13 | **Taggenaue Abrechnung, neu in v1.5** | Stunden werden ueber abrechnungsFenster()/istImFenster() aus `@/lib/verwendungsnachweis-utils` gefiltert: Schnitt aus ZA-Zeitraum und Bewilligungszeitraum (project.start_date/end_date), ISO-String-Vergleich. Die Monatsspalten der Anlage 1a bleiben, zeigen aber nur Stunden im Fenster. Test ANOVIA ZA 4 (01.07.-30.08.2026): 573,00 h T / 22,00 h NT |
| ZA-14 | **Foerderbetrag auf GANZE EURO, korrigiert in v1.6** | antZuwendung, computeArchivFoerderbetrag (beide Zweige), nwmFoerderbetrag: kaufmaennisch auf ganze Euro ueber roundEuro() aus der Lib (erst round2 gegen Gleitkomma-Rauschen, dann Math.round). Grund: das Originalformular der ZA weist die angeforderte Zuwendung in vollen Euro aus (ANOVIA ZA 1: 8.274,63 -> 8.275). Die Centrundung aus v1.5 war falsch. Die Kostenzeilen bleiben centgenau |
| ZA-15 | **Sammelueberweisung, neu in v1.7** | Knopf "Sammelueberweisung erfassen" im Archiv: Datum, Gesamtbetrag, Referenz (Vorschlag "Ueberw. TT.MM.JJ"), Aufteilung nur auf eingereichte ZA. Speichern nur bei Rest 0,00 (Cent-genau). Jeder Anteil = eine Zahlung mit gleichem Datum und gleicher Referenz |
| ZA-17 | **Sicherungen eingereichter ZA, neu in v1.8** | "ZA speichern" bei eingereichter ZA: Rueckfrage, wenn sich Nummer oder Zeitraum aendern, und Rueckfrage, wenn der neu berechnete Betrag vom gespeicherten abweicht. Abbrechen: nichts speichern, gespeicherten Stand wieder laden (loadZAIntoForm) |
| ZA-16 | **Zahlungen nur bei eingereichten ZA, neu in v1.7** | Entwurf: "erst nach Einreichung", kein Sichern, keine Neue-Zahlung-Zeile. Eine bereits vorhandene Zahlung bleibt sichtbar und entfernbar |

### Besonders fragile Bereiche:

- **calcStatus():** Eine Aenderung kann ZA-01 und ZA-08 gleichzeitig brechen.
- **foerderbetrag_gesamt-Persistenz (korrigiert v1.7):** beim Sichern einer Zahlung NIE
  einen gespeicherten Betrag ueberschreiben. Die fruehere Regel "immer neu berechnen"
  (v7.4.4-41) hat in DEV eingereichte Betraege veraendert (HEATS 26.387,72 -> 24.218).
- **openPanel und Auto-Select (neu v1.8, Ursache A-092):** Kein await zwischen
  setZAList und der Formular-Vorbelegung. openPanel traegt eine Laufnummer
  (openSeqRef); nur der zuletzt gestartete Lauf setzt State. Sonst ueberschreibt die
  Vorbelegung die per Auto-Select geladene ZA, waehrend sie markiert bleibt - "ZA
  speichern" schreibt dann den Neu-Entwurf in die alte Zeile (PROD AURA, 22.09.2026).
  Test immer ueber den ERSTEN Aufruf (Deep-Link aus dem Cockpit).
- **Zahlung an der Nummer, nicht an der Zeile (neu v1.7):** Etappe 3 (Korrekturen) legt
  mehrere Zeilen je Nummer an; Summen und Loeschlogik muessen das beruecksichtigen.
- **Zahlungsentfernen vs. ZA-Loeschen (neu v1.7):** unterschiedliche Optik (grau vs. rot)
  und Huerde (ZA-Nummer) beibehalten - Verwechslung fuehrte in DEV zum Loeschen einer ZA.
- **Option-B-DB-Load:** ProjectDetailPage darf NICHT geaendert werden (TS-1 frozen).
- **Deep-Link aus dem Cockpit:** muss ZA-01 bis ZA-14 unveraendert erhalten.
- **Abrechnungsfenster nur aus der Lib (neu v1.5):** ZAPanel und Verwendungsnachweis
  importieren dieselben Helfer. Eine lokale Kopie der Logik in einer der beiden Dateien
  laesst ZA und VN erneut auseinanderlaufen - genau das war die Ursache der
  Monatslogik-Abweichung (390,42 EUR bei ANOVIA ZA 4).
- **Gespeicherter foerderbetrag_gesamt veraltet (neu v1.5):** computeArchivFoerderbetrag
  gibt einen vorhandenen Wert unveraendert zurueck. Nach einer Aenderung an Stunden,
  Saetzen oder Rechenlogik aktualisiert sich der Wert erst, wenn die ZA aktiv gespeichert
  wird.

---

## 6a. Verhaltensvertrag: Verwendungsnachweis (neu in v1.5)

**Dateien:** src/lib/verwendungsnachweis-utils.ts,
src/components/shared/VerwendungsnachweisPanel.tsx

| Nr | Funktion | Pruefung |
|----|----------|----------|
| VN-01 | Abschnitt A taggenau | Kosten je ZA ueber computeDSPersonalkosten mit abrechnungsFenster(); identische Abgrenzung wie ZAPanel (ZA-13) |
| VN-02 | Zuwendung aus A | DS/EP: Zuwendung gesamt = round2(Foerdersatz x Summe A). NICHT die Summe der gespeicherten foerderbetrag_gesamt - das sind Anforderungen, nicht der Anspruch |
| VN-03 | Eigenanteil als Residuum | Eigenanteil = Summe A - Zuwendung gesamt. Kontrollzeile "Summe der Finanzierung" = Zuwendung + Eigenanteil, muss Summe A sein; Abweichung wird rot markiert |
| VN-04 | Schlusszahlung | Zuwendung gesamt - bisher erhaltene Zuwendungen; negativ = Rueckforderung, eigene Warnung. **v1.7:** erhalten = Summe aus v7_za_zahlungen je ZA-Nummer (Panel befuellt das Feld zahlungseingang_betrag der VN-Struktur, Lib unveraendert) |
| VN-05 | Abweichungswarnung mit Toleranz | Warnung, wenn Summe der ZA-Anforderungen vom Anspruch abweicht, erst ueber Anzahl ZA x 0,50 + 0,005 EUR (v1.6: jede ZA ist auf ganze Euro gerundet, der Anspruch auf Cent). Schwelle als finanzierung.abweichungRelevant aus der Lib, nicht in der Anzeige nachbauen |
| VN-06 | Abschnitt C Personenstunden | Kumuliert je MA (technisch/nichttechnisch/Summe), sortiert nach employee_number, gleiche Filterung wie A. Test ANOVIA: 1.353,00 / 473,33 / 1.826,33 h |
| VN-07 | NWM-Ausnahme | NW_PH1/NW_PH2 behalten die Summe der ZA-Betraege als Zuwendung (fallende Jahressaetze) und den Eigenanteil des Netzwerkpartners |
| VN-08 | **Berichtszeitraum aus Projektdaten, neu in v1.6** | Berichtszeitraum = project.start_date bis project.end_date, nicht editierbar. Der Zeitraum eines gespeicherten VN dient nur dem Vergleich: weicht er ab (z. B. nach Korrektur des Projektendes), erscheint "bitte neu speichern". Jede ZA, die den Berichtszeitraum BERUEHRT, wird aufgenommen und taggenau gekappt; ragt sie hinaus, erscheint eine Warnung |

### Besonders fragile Bereiche:

- **JSX-Text vs. JS-String:** \u-Escapes wirken nur in JS-String-Literalen. In reinem
  JSX-Text werden sie woertlich ausgegeben - dort HTML-Entities (&auml;, &szlig;).
  Konventionshinweis steht im Dateikopf; in v1.2-3 trotzdem verletzt (Fussnote C).
- **Zeitraumfilter der ZA (korrigiert v1.6):** Bis v1.2-6 zaehlte eine ZA nur, wenn
  ihr GESAMTER Zeitraum im Berichtszeitraum lag. ANOVIA ZA 5 (bis 31.08.) fiel bei einem
  gespeicherten Berichtszeitraum bis 30.08. stillschweigend komplett heraus, mit einer
  Fehlalarm-"Rueckforderung". Seit Lib v1.2-7: Ueberschneidung genuegt, Kappung per
  zaVon/zaBis, Warnung bei Ueberstand. Nie wieder auf "vollstaendig enthalten" zurueck.
- **Gespeicherter Stand vs. Projektdaten (neu v1.6):** Ein gespeicherter Wert darf eine
  Stammdaten-Aenderung (Projektende) nicht verdecken. Genau das war die Ursache oben.
- **Summen gerundeter Werte:** Die Summe von n einzeln gerundeten Betraegen ist nicht die
  gerundete Summe. Differenzen im Cent-Bereich sind strukturell, nicht behebbar (VN-05).

---

## 7. Verhaltensvertrag: ProjectTeamManager (neu in v1.2)

**Datei:** src/components/shared/ProjectTeamManager.tsx

| Nr | Funktion | Pruefung |
|----|----------|----------|
| PT-01 | Team-Liste | Alle Zuordnungen mit Lfd.-Nr., Rolle, Zeitraum, Stundensatz |
| PT-02 | Anlage-6.1-Felder | Monatsbrutto, weitere Fixbestandteile, pWAZ, bWAZ, Stundensatz = (Monatslohn x 12 + Fixbestandteile) / (pWAZ x 52) |
| PT-03 | Bewilligter Stundensatz | hourly_rate_approved getrennt vom kalkulatorischen Satz; Tabelle zeigt approved ?? kalkulatorisch |
| PT-04 | Vorbelegung aus Stammdaten | Beim Auswaehlen eines MA werden die Anlage-6.1-Vorgabewerte uebernommen, bleiben editierbar |
| PT-05 | Zuordnungszeitraum | assignment_end nie spaeter als employment_end des MA |
| PT-06 | pWAZ-Divergenz-Hinweis | Weicht die pWAZ vom aktuellen MA-Stammsatz ab, erscheint ein Hinweis mit beiden Werten - ohne Schreibzugriff. Die pWAZ ist Antragswert und wird nie automatisch angeglichen |

---

## 8. Verhaltensvertrag: Kapazitaetsplanung (neu in v1.3)

**Datei:** src/app/v7/berater/multiprojekt/page.tsx
**Genutzt in:** Berater-Portal, Kapazitaetsmatrix je Mitarbeiter und Monat
(das FZul-Vorhaben-Panel auf derselben Seite ist nicht Teil dieses Vertrags)

### Funktionen die IMMER korrekt arbeiten muessen:

| Nr | Funktion | Pruefung |
|----|----------|----------|
| KP-01 | Monatskapazitaet | Arbeitstage des Monats (Mo-Fr ohne Feiertage des Bundeslandes einschliesslich holiday_region, countWorkdaysInMonth) x WAZ/5. WAZ: Eintrag aus v7_employee_hours_history zum Monatsersten -> v7_employees.weekly_hours -> 40 |
| KP-02 | Elternzeit (Code E) | E-Tage aus v7_employee_absences (absence_code 'E', is_active, .limit(10000)), je MA und Datum einmal gezaehlt, nur Arbeitstage (Mo-Fr, kein Feiertag), hoechstens so viele wie Arbeitstage. Kapazitaet = (Arbeitstage - E-Arbeitstage) x WAZ/5. Ampel-Prozent auf Basis der VOLLEN Monatskapazitaet ohne Elternzeit. Monat vollstaendig in Elternzeit: hellblaue Zelle "E" statt Ampel, rotes E bei trotzdem geplanten oder verbuchten Stunden. Tooltip mit Zeile Elternzeit und Verfuegbar. Fuer MA ohne E-Tage sind alle Werte unveraendert |
| KP-03 | Geplante und verbuchte Stunden | Geplant = PM x 173,33, gleichmaessig auf alle Kalendermonate der AP-Laufzeit verteilt, nur fuer den laufenden und kuenftige Monate; Standard-Projekte aus v7_work_package_assignments (is_active, planned_person_months), ZIM_NETZWERK aus v7_nwm_ap_planung der Foerderzeitraeume im Anzeigezeitraum. Verbucht = v7_timesheets aller aktiven Projekte der Firma, is_active, .limit(10000), nach Buchungsmonat |
| KP-04 | Frei und Jahressummen | Frei h je Monat = max(0, Kapazitaet - geplant - verbucht). Jahressummen: Frei h = Summe der Monatswerte, Frei PM = Frei h / 173,33 |

### Besonders fragile Bereiche:

- **Voll-E-Monat:** Ohne die Sonderbehandlung zeigt die Ampelformel eine Kapazitaet von 0
  als "100 Prozent frei" (gruen). Die Pruefung `elternzeitTage > 0 && gesamt === 0` muss
  vor der Ampel stehen.
- **E auf Feiertagen:** Der Bereichsdialog schreibt E auch auf Feiertage;
  countWorkdaysInMonth zaehlt Feiertage nicht mit. E-Tage auf Feiertagen muessen deshalb
  herausfallen, sonst wird doppelt abgezogen.

---

## 9. Verhaltensvertrag: FZul-Detailseite und BSFZ-Export (neu in v1.3)

**Dateien:**
- src/app/v7/berater/multiprojekt/[id]/page.tsx (Uebersicht, Import, Jahreskalender,
  Export-Tab)
- src/app/api/export/fzul/route.ts (BSFZ-Excel aus public/templates/FZul_Vorlage.xlsx)

**Genutzt in:** Berater-Portal, FZul-Vorhaben. Die Route wird zusaetzlich von der
Alt-Seite src/app/import/page.tsx aufgerufen (Legacy-Cluster A-013).

### Funktionen die IMMER korrekt arbeiten muessen:

| Nr | Funktion | Pruefung |
|----|----------|----------|
| FD-01 | Gefoerderte Stunden | v7_timesheets in aktiven Projekten der Firma mit oeffentlichem Foerderformat (V7_PUBLIC_FUNDING_FORMATS), is_active, is_billable = true, day_type nicht vacation/sick/special_leave/holiday, .limit(10000). Identische Filter in allen vier Lesepfaden (Uebersicht, Import, Kalender, Export) |
| FD-02 | Abwesenheiten | U/K/S/E aus v7_employee_absences (is_active, .limit(10000)) ueber ladeAbwesenheiten. Mitarbeiterbezogen OHNE Projekt-Zuordnungsfenster. Wirksam nur an Arbeitstagen (Mo-Fr, kein Feiertag); an Wochenenden und Feiertagen geht der Tagestyp vor |
| FD-03 | Import | Je Tag des Vorhabenzeitraums: an Wochenende, Feiertag und Abwesenheitstag fue = verfuegbar = 0; sonst verfuegbar = max(0, Tagesarbeitszeit - gefoerdert) und fue = verfuegbar. urlaub_/krank_/sonderurlaub_hours aus der Abwesenheitszeile, bei E 0. Upsert auf (vorhaben_id, employee_id, work_date) |
| FD-04 | Jahreskalender | Die Zelle zeigt den gespeicherten fue-Wert; nur ohne gespeicherten Wert erscheint der verfuegbare Wert. Abwesenheitstag mit Kuerzel statt Eingabefeld (E bg-sky-100, U/K/S bg-violet-100). Altdaten (fue_hours > 0 an einem Abwesenheitstag): rote Zelle, Eingabe setzt 0, Hinweis mit Anzahl und Stunden. Der Kalender aendert gespeicherte fue_hours NIE selbst; Korrektur nur manuell oder per Neu-Import |
| FD-05 | Uebersicht | WAZ zum 1.1. des Wirtschaftsjahres. Max. h = WAZ/40 x 173,33 x Monate - Abwesenheits-Arbeitstage (alle Codes) x WAZ/5, Zusatzzeile "abzgl. x h Abw. (n AT)". Verf. h = max(0, Max. h - gefoerdert - FuE). Zeitraum endet am tatsaechlichen Monatsletzten des Endmonats |
| FD-06 | Export-Raster | Je Arbeitstag Tagesarbeitszeit - gefoerdert, nur Werte > 0. Leer an Wochenenden, Feiertagen (Feiertagsliste der Route, Bundesland) und Abwesenheitstagen (dayData[m][d].absence = true). Berechnung live aus v7_timesheets, nicht aus gespeicherten fue_hours |
| FD-07 | Export unterer Teil | E38 = WAZ, O39 = annual_leave_days, O40 = K-, O41 = S-, O43 = E-Arbeitstage im Exportjahr (Mo-Fr ohne Feiertag). O42 (Feiertage) bleibt Formel der Vorlage. U wird nicht uebergeben. Export-Tab je MA: Arbeitstage U, K, S, E und Urlaubsanspruch; gelber Hinweis bei U-Arbeitstagen > Anspruch, keine Umbuchung |
| FD-08 | Ladefehler | Ladefehler der Abwesenheiten (alle vier Lesepfade) und des Urlaubsanspruchs im Export-Tab werden angezeigt bzw. geworfen, nie still als 0 behandelt. Luecke siehe A-071 |

### Besonders fragile Bereiche:

- **ladeAbwesenheiten ohne Zuordnungsfenster:** bewusst anders als
  `lib/employeeAbsences.ts`. Die FZul haengt an der Person, nicht an einem Projekt. Nicht
  "vereinheitlichen".
- **Vier Lesepfade:** Uebersicht, Import, Kalender und Export fragen v7_timesheets je
  getrennt ab. Eine Filteraenderung (FD-01) ist immer in allen vier vorzunehmen.
- **Vorlagenzellen:** Eingabezellen sind E38 und O39..O43. C38, F39 und J39 liegen in
  verbundenen Beschriftungsfeldern und werden von den Formeln nicht gelesen (Ursache
  A-069).
- **E auf Feiertagen:** Abwesenheits-Arbeitstage tagesgenau zaehlen (Mo-Fr ohne
  Feiertag); sonst doppelter Abzug zusammen mit O42.
- **Route:** eigene Feiertagsfunktion (nur Bundesland, keine holiday_region) und zweiter
  Aufrufer (Alt-Seite src/app/import/page.tsx). Nach jeder Aenderung an der Route eine
  Excel oeffnen und E38, O39..O43 sowie die Jahresarbeitszeit gegen eine Handrechnung
  pruefen.

### Bekannte Luecken (nicht Bestandteil des Smoke-Tests):

| Nr | Luecke | Stand |
|----|--------|-------|
| A-070 | Export-Raster fuellt Januar bis Dezember unabhaengig von start_monat/ende_monat des Vorhabens; bei einem unterjaehrigen Vorhaben stuenden FuE-Stunden in Monaten ausserhalb der Laufzeit | Offen. PROD derzeit ohne Wirkung (alle Vorhaben 1-12, Abfrage 11.09.2026) |
| A-071 | Ladefehler still als 0: die v7_timesheets-Abfragen der vier Lesepfade werten `error` nicht aus (gefoerdert 0 -> zu viele FZul-Stunden); die Excel-Erzeugung liest annual_leave_days ohne Fehlerpruefung (`?? 0` -> O39 = 0) | Offen |
| - | Gespeicherte Kalenderwerte (fue_hours) gehen nicht in die BSFZ-Excel | Fachliche Entscheidung offen (PH Paragraph 5) |
| - | Zeile 45 (Kuerzung unterjaehrig) fest 1; E38 = WAZ zum 1.1. auch bei Jahresnavigation; Kurzarbeit nicht in O43 | Offen (PH Paragraph 5) |
| - | Regionale Feiertage (holiday_region): Seite ja, Route und Vorlage nein | Randfall |

---

## 10. Infrastruktur-Checkliste

| Nr | Pruefpunkt | Wann pruefen |
|----|------------|--------------|
| IF-01 | Supabase Max Rows >= 10000 | Bei jedem neuen Supabase-Projekt |
| IF-02 | DEV-Schema identisch mit PROD | Nach jeder DB-Migration |
| IF-03 | .limit(10000) in neuen Queries | Bei jeder neuen v7_timesheets-Query |
| IF-04 | UTF-8/ASCII sauber | Vor jeder Datei-Auslieferung |
| IF-05 | Aktuelle Datei-Version als Basis | Vor jeder Code-Aenderung |
| IF-06 | DEV-Test vor PROD-Deploy | Nach jeder Code-Aenderung |
| IF-07 | Print-Vorschau nach CSS-Aenderung | Bei jeder Aenderung an Komponenten mit Print |
| IF-08 | Release-Tag setzen (v1.2) | Nach jedem PROD-Deploy: `git tag -a vX.Y.Z`, push auf origin UND cubintec |
| IF-09 | Monatsverlauf in zwei Implementierungen (v1.3) | Bei jeder Aenderung am Monatsverlauf-Diagramm: ProjektFortschrittPanel UND FirmaCockpit anpassen; Kontrolle per Suche nach den dataKey-Namen ueber src/ |
| IF-10 | is_billable bei "gefoerdert" (v1.3) | Bei jeder neuen oder geaenderten v7_timesheets-Query, die gefoerderte oder zuschussfaehige Stunden summiert: Filter `is_billable = true`. Grund: TF-12 legt an jedem Arbeitstag Zeilen "Nicht zuschussfaehige Arbeiten" (ohne AP, is_billable = false) an (A-068) |
| IF-11 | Fehlerauswertung und Datumsgrenzen (v1.3) | Bei jeder neuen oder geaenderten Query: `error` auswerten - ein Ladefehler wird angezeigt oder geworfen, nie still als leer oder 0 behandelt. Monatsende immer als tatsaechlichen Monatsletzten berechnen, nie fest "-31" (Postgres lehnt ungueltige Daten ab; ohne Fehlerauswertung bleibt das unbemerkt). Bestandscode erfuellt das noch nicht ueberall (A-071) |
| IF-12 | Abrechnungsgrenzen taggenau (v1.5) | Bei jeder Filterung von Stunden gegen einen Abrechnungs-, Berichts- oder Bewilligungszeitraum: TAGGENAU per ISO-String-Vergleich ('YYYY-MM-DD'), nie ueber ganze Kalendermonate und nie ueber new Date(iso) mit getFullYear/getMonth (UTC-Parsing, Ortszeit-Auswertung). Zusaetzlich auf project.start_date/end_date kappen |
| IF-13 | Rundung nach Formular (korrigiert v1.6) | Angeforderte Zuwendung je ZA: kaufmaennisch auf GANZE EURO ueber roundEuro(). Kosten, Kostenzeilen und Verwendungsnachweis: centgenau ueber round2(). Beide aus der VN-Lib, nie lokal nachbauen. Die Summe einzeln gerundeter Werte ist nicht die gerundete Summe - Vergleiche brauchen eine Toleranz (VN-05) |
| IF-14 | Lokaler Test nur `npm run build` (v1.5) | Kein vorgeschalteter `npx tsc --noEmit`: der Build prueft keine Typen, ein separater tsc-Lauf bricht an 55 latenten Altfehlern und an Ablageordnern ab (A-080). Siehe DEPLOY-PROZESS-PZE.md |
| IF-15 | Zahlungseingaenge nur aus v7_za_zahlungen (v1.7) | Bei jedem neuen Leser von Zahlungen: Summe der aktiven Zeilen je (project_id, za_nummer). Die Spalten zahlungseingang_* in v7_zahlungsanforderungen sind veraltet und werden weder gelesen noch geschrieben |

---

## 11. Eskalationsregeln

- **Wenn unklar ob eine Funktion betroffen ist:** FRAGEN, nicht raten.
- **Wenn eine Aenderung mehr als 20 Zeilen betrifft:** Plan vorlegen, GO abwarten.
- **Wenn eine Aenderung mehrere Komponenten betrifft:** Alle Vertraege pruefen.
- **Wenn ein Smoke-Test fehlschlaegt:** SOFORT stoppen, nicht "schnell noch fixen".

---

## 12. Versionierung dieses Dokuments

| Version | Datum | Aenderung |
|---------|-------|-----------|
| 1.0 | 29.05.2026 | Entwurf zur Abstimmung (Session 46) |
| 1.1 | 29.05.2026 | Angenommen (Session 47). ZAPanel-Vertrag (ZA-01..11) ergaenzt. Versionsnummern entfernt. Inhalt verbindlich uebernommen in Pflichtenheft Paragraph 12e. |
| 1.2 | 09.09.2026 | Session 81 (V7.9.7). TF-04, TF-05, TF-07, TF-09 und TF-12 um die Aenderungen aus V7.9.7 ergaenzt (Elternzeit-Ausnahmen, WAZ-Quelle, "sonstige Arbeiten" immer als Differenz). Neu: TF-15 Elternzeit (Code E). Fragile Bereiche des TimesheetForm um Monats-Abgleich, Auto-Vorbelegung und pointer-events erweitert. Neuer Abschnitt 7: Verhaltensvertrag ProjectTeamManager (PT-01..06). ZA-12 (FZ-basierte Foerderquote) und PF-08 (NWM-Jahresselektor) nachgetragen. BP-06 um die pWAZ-Klarstellung ergaenzt. IF-08 Release-Tag ergaenzt. |
| 1.3 | 11.09.2026 | Session 84 (Stand V7.9.11, reine Dokumentation). Neuer Abschnitt 8: Kapazitaetsplanung (KP-01..04, aus v5.43). Neuer Abschnitt 9: FZul-Detailseite und BSFZ-Export (FD-01..08, aus v5.44), jede Regel gegen den deployten Code geprueft; dabei zwei Luecken gefunden und als A-070 (Export-Raster ausserhalb der Vorhabenmonate) und A-071 (Ladefehler still als 0) aufgenommen. PF-09 gemeinsamer Bezugsrahmen der Foerderkennzahlen (aus v5.42). IF-09 Monatsverlauf in zwei Implementierungen (aus v5.42), IF-10 is_billable bei "gefoerdert" (A-068), IF-11 Fehlerauswertung und Datumsgrenzen. Fragile Bereiche: TimesheetForm (Wirkung der Auto-Vorbelegung nach aussen), FirmaCockpit (eigene Diagramm-Kopie). Infrastruktur, Eskalation und Versionierung als Abschnitte 10 bis 12. Korrekturstand VERHALTENSVERTRAG-v1_3-2.md: aufgebaut auf der downloads-Fassung von v1.2; der erste Stand VERHALTENSVERTRAG-v1_3.md basierte versehentlich auf der aelteren, ausfuehrlicheren Projektkopie von v1.2 und ist verworfen. |
| 1.8 | 22.09.2026 | Session 89 (V7.9.16). ZA-04 Betragseingabe nur Komma; neu ZA-17 Sicherungen eingereichter ZA; fragiler Bereich openPanel/Auto-Select (A-092). |
| 1.7 | 21.09.2026 | Session 88 (V7.9.15). ZA-03 Archiv oben rechts, ZA-04 Zahlungsliste aus v7_za_zahlungen, ZA-05 korrigiert (Betrag nie durch Zahlung ueberschrieben), ZA-07 Loeschen mit ZA-Nummer, neu ZA-15 Sammelueberweisung und ZA-16 Zahlungen nur bei eingereichten ZA, drei fragile Bereiche. FC-04 Summe/Popup/Archiv-Link. VN-04 auf v7_za_zahlungen. Neu IF-15. |
| 1.6 | 21.09.2026 | Session 87 (V7.9.14). ZA-14 und IF-13 korrigiert: Anforderung je ZA wieder auf ganze Euro (roundEuro), Kosten und VN centgenau. VN-05 Toleranz auf Anzahl ZA x 0,50 + 0,005 EUR. Neu VN-08 Berichtszeitraum aus Projektdaten. Fragile Bereiche VN: Zeitraumfilter korrigiert (Ueberschneidung statt vollstaendiger Enthaltenheit), gespeicherter Stand vs. Projektdaten. |
| 1.5 | 21.09.2026 | Session 86 (V7.9.13). TF-16 Sperre fuer Projektstunden ausserhalb des Bewilligungszeitraums (nur AP-Zeilen) mit drei neuen fragilen Bereichen (Reichweite der Sperre, Speichern schreibt den Monat neu, Leeren loest Vorbelegung aus). FC-04 um Abrechnungszeitraum und Vollstaendigkeitspruefung. ZA-13 taggenaue Abrechnung, ZA-14 centgenauer Foerderbetrag, zwei fragile Bereiche. Neuer Abschnitt 6a Verwendungsnachweis (VN-01..07). IF-12 taggenaue Grenzen, IF-13 centgenaue Rundung, IF-14 lokaler Test nur per Build. |
| 1.4 | 17.09.2026 | Session 85 (V7.9.12). Neuer Abschnitt 4a Monatsstatus (MS-01..05) fuer Stundennachweis-Matrix und Mein Status. TF-08 um den Speicherzwang vor dem Abschluss ergaenzt; fragiler Bereich TimesheetForm "Auto-Vorbelegung setzt hasChanges nicht". BP-03 auf MS-01..05 umgestellt. |
