# VERHALTENSVERTRAG - Kritische Komponenten

**Version 1.1 - ANGENOMMEN in Session 47**
**Datum:** 29. Mai 2026
**Ziel:** Sicherstellen, dass bei Code-Aenderungen keine bestehenden Funktionen brechen

> **VERBINDLICHE QUELLE:** Der Inhalt dieses Vertrags ist seit Session 47 verbindlich
> im Pflichtenheft als Paragraph 12e gepflegt (eine Quelle der Wahrheit). Aenderungen
> am Vertrag erfolgen ab sofort dort. Dieses Dokument ist der angenommene Stand zur
> Erstaufnahme und dient als kompakte Arbeitskopie.

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
| TF-04 | Feiertage in S-Zeile | Werktags-Feiertage automatisch mit Tagesstunden vorbelegt |
| TF-05 | Fehlzeiten U/K/S editierbar | Tageszellen frei editierbar, Summen korrekt |
| TF-06 | Wochenende/Feiertag Hintergrund | Sa/So grau, Feiertage orange |
| TF-07 | Summenberechnung | Zeilensumme (S), Tagessumme, Gesamtsumme korrekt |
| TF-08 | Monatsabschluss | Button setzt/entfernt Completion-Flag |
| TF-09 | Arbeitszeitgrenzen | Tagesgrenze 9h (hart), Monatsgrenze (weich), Zellfaerbung |
| TF-10 | Kumulierte Stunden (Arbeitsplan) | offen-Spalte zeigt verbleibende Stunden pro AP |
| TF-11 | Druck/PDF | AP-Name vollstaendig, AP-Nummer sichtbar, Layout A4 Querformat |
| TF-12 | Nicht-zuschussfaehige Arbeiten | Sonstige-Zeile editierbar, nicht in Summe (2) |
| TF-13 | Durchfuehrbarkeitsstudie (DS) | T/NT-Spalte bei ZIM_DS-Projekten |
| TF-14 | Mehrere AP-Zeilen | Dynamisches Hinzufuegen, max. 4 initial |

### Besonders fragile Bereiche (erhoehte Vorsicht):

- **loadTimeEntries-Funktion:** Laed AP-Eintraege, Fehlzeiten, Feiertage, sonstige Arbeiten.
  Aenderungen hier koennen TF-01 bis TF-06 gleichzeitig brechen.
- **Print-Styles (@media print):** Aenderungen an Screen-CSS koennen Print-Layout zerstoeren.
  IMMER Druckvorschau pruefen nach CSS-Aenderungen.
- **useEffect-Dependencies:** Fehlende Dependencies = veraltete Daten. Zu viele = Endlos-Loop.

---

## 3. Verhaltensvertrag: BerichtePage

**Datei:** src/components/shared/BerichtePage.tsx
**Genutzt in:** Berater-Portal + Firma-Portal (Dashboard/Berichte)

### Funktionen die IMMER korrekt arbeiten muessen:

| Nr | Funktion | Pruefung |
|----|----------|----------|
| BP-01 | Zeiterfassungs-Status Tabelle | Erfasst(h) pro MA identisch mit Arbeitsplan "davon erfasst" |
| BP-02 | ProjektFortschrittPanel | Monatsverlauf-Chart: alle Monate vollstaendig, Ist-Balken plausibel |
| BP-03 | Stundennachweis-Matrix | Ampeln korrekt (gruen=vollstaendig, orange=teilweise, grau=leer) |
| BP-04 | Timesheet-Daten vollstaendig | Alle Eintraege geladen (.limit(10000), keine Abschneidung) |
| BP-05 | Projekt-Auswahl | Dropdown filtert korrekt auf ausgewaehltes Projekt |
| BP-06 | MA-Stundensaetze | Korrekte Berechnung aus Gehaltsdaten (Anlage 6.1) |
| BP-07 | Excel-Export | Vollstaendige Daten, korrekte Formatierung |
| BP-08 | Meine Projekte (Firma) | Klickbare Projektliste im Dashboard |

### Besonders fragile Bereiche:

- **Timesheet-Query:** Muss .limit(10000) haben UND Supabase Max Rows >= 10000.
  BEIDE Bedingungen muessen erfuellt sein.
- **timesheets State:** Wird an ProjektFortschrittPanel, ZE-Status und Matrix weitergereicht.
  Aenderung an der Query betrifft ALLE drei Panels gleichzeitig.

---

## 4. Verhaltensvertrag: FirmaCockpit

**Datei:** src/components/shared/FirmaCockpit.tsx
**Genutzt in:** Berater-Portal (Firmenansicht im App-Modus)

### Funktionen die IMMER korrekt arbeiten muessen:

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
**Genutzt in:** BerichtePage + FirmaCockpit

### Funktionen die IMMER korrekt arbeiten muessen:

| Nr | Funktion | Pruefung |
|----|----------|----------|
| PF-01 | Laufzeit/PM/Kosten KPIs | Prozent und Absolutwerte korrekt |
| PF-02 | Monatsverlauf-Chart | Ist vs. Soll pro Monat, kumulierte Linien |
| PF-03 | Prognose | Gestrichelte Linie basierend auf letzten 3 Monaten |
| PF-04 | Zielerreichungs-Prognose | Erreichbar/Gefaehrdet/Kritisch korrekt berechnet |
| PF-05 | PM je Mitarbeiter (Plan vs. Ist) | Balkendiagramm pro MA |
| PF-06 | Personalkosten je MA | Balkendiagramm basierend auf Stundensaetzen |
| PF-07 | Drucken/PDF | Chart + KPIs auf einer A4-Seite |

### Hinweis (Refactor projektfortschritt-utils, Session 47 Punkt 3):

Beim Auslagern der Berechnungslogik nach projektfortschritt-utils muessen PF-02, PF-03
und PF-04 rechnerisch bit-genau identische Ergebnisse liefern wie vor dem Refactor.
Vergleichswerte vor dem Refactor festhalten und nach dem Refactor gegenpruefen.

---

## 6. Verhaltensvertrag: ZAPanel (Zahlungsanforderung)

**Datei:** src/components/shared/ZAPanel.tsx
**Genutzt in:** ZASeite (Berater + Firma), aufgerufen aus FirmaCockpit / Cockpit ZA-Liste

### Funktionen die IMMER korrekt arbeiten muessen:

| Nr | Funktion | Pruefung |
|----|----------|----------|
| ZA-01 | Status-Automatik | Status wird per calcStatus aus Datumsfeldern abgeleitet: kein eingereicht_am=Entwurf; eingereicht_am ohne Zahlung=Eingereicht; Zahlung >= erwartet=volle_zahlung; sonst gekuerzte_zahlung. Keine manuellen Status-Buttons. |
| ZA-02 | Einreichdatum editierbar | eingereicht_am im Formular editierbar; Setzen schaltet Status auf Eingereicht |
| ZA-03 | Tabs | Deckblatt / Anlage 1a / Anlage 1b / Archiv jeweils korrekt befuellt |
| ZA-04 | Archiv-Tab Zahlungseingang | Datum, Betrag, Anmerkung speicherbar; Validierung: Datum erfordert Betrag > 0 |
| ZA-05 | Foerderbetrag-Persistenz | foerderbetrag_gesamt beim Sichern neu berechnet UND gespeichert (Cockpit liest gespeicherten Wert, sonst 0 EUR) |
| ZA-06 | Historische Werte | Archiv-Tab zeigt gespeicherten Foerderbetrag, keine Neuberechnung bestehender Eintraege |
| ZA-07 | ZA loeschen | Nur im Archiv-Tab, mit Bestaetigung |
| ZA-08 | Status-Rollback | "Zurueck zu Eingereicht" (primaer) und "Zurueck zu Entwurf" (sekundaer) verfuegbar |
| ZA-09 | Netzwerk-Modus | isNetzwerk bei ZIM_NETZWERK; NWM-Kostenfelder (Personal, Dritte, uebrige, gesamt); Laufzeitjahr aus bewilligung_datum |
| ZA-10 | DB-Felder ohne Props (Option B) | bewilligung_datum, bewilligte_summe direkt aus DB im Panel laden (ProjectDetailPage frozen, TS-1) |
| ZA-11 | Status-Badge-Farben | grau=Entwurf, blau=Eingereicht, gruen=Bewilligt/Zahlung |

### Besonders fragile Bereiche:

- **calcStatus():** Eine Aenderung kann ZA-01 und ZA-08 gleichzeitig brechen.
- **foerderbetrag_gesamt-Persistenz:** Wird beim Sichern nicht mitgespeichert -> Cockpit
  zeigt 0 EUR (war Bug, behoben in v7.4.4-41). Beim Archiv-Speichern immer neu berechnen
  + persistieren.
- **Option-B-DB-Load:** ProjectDetailPage darf NICHT geaendert werden (TS-1 frozen).
- **Deep-Link aus dem Cockpit (Session 47 Punkt 2):** Klick auf ZA-Nummer oeffnet ZA direkt.
  Der direkte Einsprung muss ZA-01 bis ZA-11 unveraendert erhalten.

---

## 7. Infrastruktur-Checkliste

Zusaetzlich zu den Komponenten-Vertraegen:

| Nr | Pruefpunkt | Wann pruefen |
|----|------------|--------------|
| IF-01 | Supabase Max Rows >= 10000 | Bei jedem neuen Supabase-Projekt |
| IF-02 | DEV-Schema identisch mit PROD | Nach jeder DB-Migration |
| IF-03 | .limit(10000) in neuen Queries | Bei jeder neuen v7_timesheets-Query |
| IF-04 | UTF-8/ASCII sauber | Vor jeder Datei-Auslieferung |
| IF-05 | Aktuelle Datei-Version als Basis | Vor jeder Code-Aenderung (Projektverzeichnis pruefen) |
| IF-06 | DEV-Test vor PROD-Deploy | Nach jeder Code-Aenderung |
| IF-07 | Print-Vorschau nach CSS-Aenderung | Bei jeder Aenderung an Komponenten mit Print |

---

## 8. Eskalationsregeln

- **Wenn unklar ob eine Funktion betroffen ist:** FRAGEN, nicht raten.
- **Wenn eine Aenderung mehr als 20 Zeilen betrifft:** Plan vorlegen, GO abwarten.
- **Wenn eine Aenderung mehrere Komponenten betrifft:** Alle Vertraege pruefen.
- **Wenn ein Smoke-Test fehlschlaegt:** SOFORT stoppen, nicht "schnell noch fixen".
  Zurueck zur letzten funktionierenden Version, dann sauber neu ansetzen.

---

## 9. Versionierung dieses Dokuments

| Version | Datum | Aenderung |
|---------|-------|-----------|
| 1.0 | 29.05.2026 | Entwurf zur Abstimmung (Session 46) |
| 1.1 | 29.05.2026 | Angenommen (Session 47). ZAPanel-Vertrag (ZA-01..11) ergaenzt. Versionsnummern entfernt (versionsunabhaengige Checklisten). PF-Refactor-Hinweis ergaenzt. Inhalt verbindlich uebernommen in Pflichtenheft Paragraph 12e. |
