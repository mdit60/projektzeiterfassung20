# VERHALTENSVERTRAG - Kritische Komponenten

**Version 1.2 - fortgeschrieben in Session 81 (09.09.2026)**
**Datum:** 9. September 2026
**Loest ab:** VERHALTENSVERTRAG-v1_1.md (angenommen Session 47, 29.05.2026)
**Ziel:** Sicherstellen, dass bei Code-Aenderungen keine bestehenden Funktionen brechen

> **VERBINDLICHE QUELLE:** Der Inhalt dieses Vertrags ist seit Session 47 verbindlich
> im Pflichtenheft als Paragraph 12e gepflegt (eine Quelle der Wahrheit). Aenderungen
> am Vertrag erfolgen dort; die Aenderungen der Version 1.2 stehen im
> PFLICHTENHEFT-v5_40-AENDERUNGSBLOCK.md (Aenderung 8). Dieses Dokument ist die
> kompakte Arbeitskopie.

**Versionshinweis:** Versionsnummern der Komponenten sind bewusst NICHT eingebacken.
Die Funktions-Checklisten sind versionsunabhaengig. Die jeweils aktuelle Datei-Version
ist immer dem Projektverzeichnis zu entnehmen.

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
| TF-08 | Monatsabschluss | Button setzt/entfernt Completion-Flag |
| TF-09 | Arbeitszeitgrenzen | Tagesgrenze 9h (hart), Monatsgrenze (weich), Zellfaerbung. Massgebliche Wochenarbeitszeit: Teilzeit-Historie -> v7_employees.weekly_hours -> Firmenstandard; die projektbezogene pWAZ ist KEINE Quelle (v1.2) |
| TF-10 | Kumulierte Stunden (Arbeitsplan) | offen-Spalte zeigt verbleibende Stunden pro AP |
| TF-11 | Druck/PDF | AP-Name vollstaendig, AP-Nummer sichtbar, Layout A4 Querformat |
| TF-12 | Nicht-zuschussfaehige Arbeiten | Sonstige-Zeile editierbar, nicht in Summe (2). **Neu (v1.2): an einem reinen Arbeitstag ist der Wert IMMER die Differenz aus Tagesarbeitszeit und gebuchten Stunden (Tages- und Wochendeckel) und folgt jeder Aenderung der Projektstunden - er wird nicht eingefroren.** Wochenenden, Feiertage, gesperrte Tage, Kurzarbeit und Abwesenheitstage bleiben von der Auto-Vorbelegung unberuehrt; dort eingetragene Werte bleiben erhalten |
| TF-13 | Durchfuehrbarkeitsstudie (DS) | T/NT-Spalte bei ZIM_DS-Projekten |
| TF-14 | Mehrere AP-Zeilen | Dynamisches Hinzufuegen, max. 4 initial |
| TF-15 | **Elternzeit (Code E), neu in v1.2** | E-Tage werden angezeigt (eigene Zeile mit Tageszahl), sperren den Tag vollstaendig (Projekt, sonstige, U/K/S) und ueberleben jedes Speichern des Monats. Erfassung und Ruecknahme ausschliesslich ueber den Bereichsdialog (Rechtsklick oder Eingabe "E"), nur fuer Berater und Firmen-Administrator. Der Monats-Abgleich beim Speichern darf E-Zeilen NIE deaktivieren |

### Besonders fragile Bereiche (erhoehte Vorsicht):

- **loadTimeEntries-Funktion:** Laed AP-Eintraege, Fehlzeiten, Feiertage, sonstige Arbeiten
  und (ab V7.9.7) Elternzeit-Tage. Aenderungen hier koennen TF-01 bis TF-07 und TF-15
  gleichzeitig brechen.
- **Monats-Abgleich der Abwesenheiten beim Speichern:** Deaktiviert jede aktive Zeile des
  Monats, die nicht im Soll-Stand steht. Der Soll-Stand kennt nur U/K/S - die Ist-Abfrage
  MUSS deshalb auf `absence_code IN ('U','K','S')` gefiltert bleiben, sonst verschwinden
  Elternzeit-Zeitraeume beim naechsten Speichern (TF-15).
- **Auto-Vorbelegung "sonstige Arbeiten":** Tages- UND Wochendeckel. Wer hier eine zweite
  Berechnungsformel einfuehrt (z.B. beim Laden), erzeugt Divergenzen - genau das war die
  Ursache des Einfrierens vor V7.9.7 (TF-12).
- **Print-Styles (@media print):** Aenderungen an Screen-CSS koennen Print-Layout zerstoeren.
  IMMER Druckvorschau pruefen nach CSS-Aenderungen.
- **pointer-events auf gesperrten Zellen:** Ein disabled-Input ohne `pointer-events-none`
  verschluckt den Rechtsklick; das Kontextmenue ist dann nicht erreichbar.
- **useEffect-Dependencies:** Fehlende Dependencies = veraltete Daten. Zu viele = Endlos-Loop.

---

## 3. Verhaltensvertrag: BerichtePage

**Datei:** src/components/shared/BerichtePage.tsx
**Genutzt in:** Berater-Portal + Firma-Portal (Dashboard/Berichte)

| Nr | Funktion | Pruefung |
|----|----------|----------|
| BP-01 | Zeiterfassungs-Status Tabelle | Erfasst(h) pro MA identisch mit Arbeitsplan "davon erfasst" |
| BP-02 | ProjektFortschrittPanel | Monatsverlauf-Chart: alle Monate vollstaendig, Ist-Balken plausibel |
| BP-03 | Stundennachweis-Matrix | Ampeln korrekt (gruen=vollstaendig, orange=teilweise, grau=leer) |
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
| FC-04 | Zahlungsanforderungen | ZA-Liste mit Betraegen, Einreichdatum |
| FC-05 | Mitarbeiter-Modal | Neuer MA, MA bearbeiten, PW-Reset |
| FC-06 | Navigation | PortalNav korrekt, returnTo funktioniert |
| FC-07 | Timesheet-Daten vollstaendig | .limit(10000), keine Abschneidung |

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

### Hinweis (Refactor projektfortschritt-utils, Session 47 Punkt 3):

PF-02, PF-03 und PF-04 muessen nach einem Refactor rechnerisch bit-genau identische
Ergebnisse liefern. Vergleichswerte vorher festhalten.

---

## 6. Verhaltensvertrag: ZAPanel (Zahlungsanforderung)

**Datei:** src/components/shared/ZAPanel.tsx

| Nr | Funktion | Pruefung |
|----|----------|----------|
| ZA-01 | Status-Automatik | Status per calcStatus aus Datumsfeldern; keine manuellen Status-Buttons |
| ZA-02 | Einreichdatum editierbar | eingereicht_am editierbar; Setzen schaltet Status auf Eingereicht |
| ZA-03 | Tabs | Deckblatt / Anlage 1a / Anlage 1b / Archiv korrekt befuellt |
| ZA-04 | Archiv-Tab Zahlungseingang | Datum, Betrag, Anmerkung speicherbar; Datum erfordert Betrag > 0 |
| ZA-05 | Foerderbetrag-Persistenz | foerderbetrag_gesamt beim Sichern neu berechnet UND gespeichert |
| ZA-06 | Historische Werte | Archiv zeigt gespeicherten Foerderbetrag, keine Neuberechnung |
| ZA-07 | ZA loeschen | Nur im Archiv-Tab, mit Bestaetigung |
| ZA-08 | Status-Rollback | "Zurueck zu Eingereicht" und "Zurueck zu Entwurf" verfuegbar |
| ZA-09 | Netzwerk-Modus | isNetzwerk bei ZIM_NETZWERK; NWM-Kostenfelder; Laufzeitjahr aus bewilligung_datum |
| ZA-10 | DB-Felder ohne Props (Option B) | bewilligung_datum, bewilligte_summe direkt aus DB (ProjectDetailPage frozen) |
| ZA-11 | Status-Badge-Farben | grau=Entwurf, blau=Eingereicht, gruen=Bewilligt/Zahlung |
| ZA-12 | FZ-basierte Foerderquote (NWM) | Foerderquote aus v7_nwm_foerderzeitraeume (Abgleich zeitraum_bis), Badge "aus FZ-Tabelle"/"Fallback"; bei FZ-Grenzueberschreitung rote Meldung und Speichersperre |

### Besonders fragile Bereiche:

- **calcStatus():** Eine Aenderung kann ZA-01 und ZA-08 gleichzeitig brechen.
- **foerderbetrag_gesamt-Persistenz:** beim Archiv-Speichern immer neu berechnen + persistieren.
- **Option-B-DB-Load:** ProjectDetailPage darf NICHT geaendert werden (TS-1 frozen).
- **Deep-Link aus dem Cockpit:** muss ZA-01 bis ZA-12 unveraendert erhalten.

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

## 8. Infrastruktur-Checkliste

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

---

## 9. Eskalationsregeln

- **Wenn unklar ob eine Funktion betroffen ist:** FRAGEN, nicht raten.
- **Wenn eine Aenderung mehr als 20 Zeilen betrifft:** Plan vorlegen, GO abwarten.
- **Wenn eine Aenderung mehrere Komponenten betrifft:** Alle Vertraege pruefen.
- **Wenn ein Smoke-Test fehlschlaegt:** SOFORT stoppen, nicht "schnell noch fixen".

---

## 10. Versionierung dieses Dokuments

| Version | Datum | Aenderung |
|---------|-------|-----------|
| 1.0 | 29.05.2026 | Entwurf zur Abstimmung (Session 46) |
| 1.1 | 29.05.2026 | Angenommen (Session 47). ZAPanel-Vertrag (ZA-01..11) ergaenzt. Versionsnummern entfernt. Inhalt verbindlich uebernommen in Pflichtenheft Paragraph 12e. |
| 1.2 | 09.09.2026 | Session 81 (V7.9.7). TF-04, TF-05, TF-07, TF-09 und TF-12 um die Aenderungen aus V7.9.7 ergaenzt (Elternzeit-Ausnahmen, WAZ-Quelle, "sonstige Arbeiten" immer als Differenz). Neu: TF-15 Elternzeit (Code E). Fragile Bereiche des TimesheetForm um Monats-Abgleich, Auto-Vorbelegung und pointer-events erweitert. Neuer Abschnitt 7: Verhaltensvertrag ProjectTeamManager (PT-01..06). ZA-12 (FZ-basierte Foerderquote) und PF-08 (NWM-Jahresselektor) nachgetragen. BP-06 um die pWAZ-Klarstellung ergaenzt. IF-08 Release-Tag ergaenzt. |
