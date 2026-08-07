# KONZEPT: Fördermonitor - Kundenspezifisches Förder-Matching (FMM)

**Version:** 0.1 (Erstentwurf)
**Datum:** 12. Juli 2026
**Status:** Entwurf - zur Abstimmung mit Cornelius und Katrin
**Betrifft:** PZE V7, neues Berater-Modul; baut auf dem bestehenden Fördermonitor-Prototyp auf (foerdermonitor.onrender.com)
**Verwandt:** KONZEPT-MULTIPROJEKT-FZUL v1.2 und KONZEPT-KAPAZITAETSPLANUNG v1.1 (FZul ist eine der Zielförderungen, auf die der Monitor verweist)

---

## 1. Motivation und Einordnung

### 1.1 Ausgangslage

Aktuelle Förderprogramme von Bund und Ländern rechtzeitig zu finden und ihre Eignung
zu beurteilen ist zunehmend schwierig. Zwei Entwicklungen verschärfen das gerade:

- **ZIM ausgesetzt:** Seit dem 7. Juli 2026 (12:00 Uhr) nimmt das Zentrale Innovations-
  programm Mittelstand befristet keine Anträge mehr an; eine Wiederaufnahme ist frühestens
  für Anfang 2027 angestrebt und hängt vom Bundeshaushalt 2027 ab. Für neue FuE-Vorhaben
  fällt damit das wichtigste Zuschussinstrument vorübergehend aus - die Suche nach
  Alternativen wird selbst zur Beratungsleistung.
- **Marktlücke Aktualität und Tiefe:** Die offizielle Förderdatenbank des Bundes
  (foerderdatenbank.de) listet zwar rund 2.500 offene Programme mit Basisfiltern, bietet
  aber wenig Informationstiefe. Man muss in jedes Programm einzeln einsteigen und die
  Richtlinie lesen, um zu beurteilen, ob und wie es zu einem konkreten Unternehmen passt.

### 1.2 Zielbild und Geschäftsmodell

Der Fördermonitor wird zu einem **kundenspezifischen Beratungsangebot** ausgebaut: Kunden
nutzen und bezahlen Cubintec dafür, dass wir ihnen die **optimale Förderung beschaffen** -
nicht für eine weitere Programmliste, die es kostenlos schon gibt. Der verkaufbare Wert ist
das **Ergebnis**: eine kurze, geprüfte, auf das jeweilige Unternehmen zugeschnittene Auswahl
passender Programme samt Einschätzung und nächsten Schritten.

### 1.3 Abgrenzung zum bestehenden Prototyp

Der heutige Fördermonitor (Cornelius) spiegelt im Wesentlichen die Förderdatenbank. Der
Mehrwert dieses Konzepts liegt in vier Ergänzungen, die den Prototyp zum Beratungswerkzeug
machen:

1. **Matching** - Programme werden gegen das konkrete Firmenprofil gefiltert und priorisiert.
2. **Tiefe** - je Kandidat ein strukturierter Steckbrief mit Eignungsbewertung statt roher
   Kurzbeschreibung.
3. **Monitoring** - automatische Meldung neuer, geänderter oder gestoppter Programme.
4. **Report** - ein verkaufbares, kundengerichtetes Ergebnisdokument.

---

## 2. Kernprinzip: zwei Schichten plus Monitoring

Der fachliche Kern ist ein Trichter von der Breite zur geprüften Empfehlung:

```
Förderdatenbank (XML-Vollexport, ~2.500 Programme)
        │  Import + Normalisierung
        ▼
[ Schicht 1: MATCHING ]  Firmenprofil x Programm-Attribute
        │  harte Ausschlusskriterien + weiches Ranking
        ▼
Shortlist je Mandant (z. B. 5-15 Programme, mit Score + Begruendung)
        │
        ▼
[ Schicht 2: TIEFE ]     Steckbrief + Eignungsbewertung je Kandidat
        │  KI-Entwurf  ->  Berater-Freigabe (Human in the loop)
        ▼
Kunden-Report (verkaufbares Ergebnis)

[ MONITORING ] laeuft quer: RSS + periodischer Re-Import -> Alerts
```

Schicht 1 beantwortet **"welche Programme kommen ueberhaupt in Frage?"**, Schicht 2
beantwortet **"passt das wirklich, und was bringt es dieser Firma konkret?"** - genau die
Handarbeit, die heute pro Programm manuell anfällt.

---

## 3. Datengrundlage

### 3.1 Offizieller XML-Vollexport (rechtlich sauber)

Die Förderdatenbank stellt ihren **kompletten Datenbestand als XML-Export** bereit
(Endpunkt `foerderdatenbank.de/FDB/WS/export`, dazu eine Schnittstellenbeschreibung als PDF).

- **Lizenz:** Creative Commons **CC BY 4.0** - Nutzung, Bearbeitung und Weiterverbreitung
  erlaubt, Bedingung ist die **Namensnennung** der Quelle. Das ist die rechtliche Grundlage,
  den Bestand in PZE einzulesen und im Kunden-Report zu verwerten. Kein Scraping noetig,
  kein Graubereich.
- **Umfang:** rund 2.500 antragsoffene Programme von Bund, Ländern und EU.

### 3.2 RSS-Feed fuer Aktualitaet

Die Förderdatenbank bietet einen RSS-Feed fuer Aktuelles. Er ist die Grundlage des
Monitorings (Schicht Monitoring, §6): neue und geänderte Programme werden zeitnah erkannt,
ohne den kompletten Bestand permanent neu zu ziehen.

### 3.3 Programm-Detailseiten als Tiefenquelle

Fuer Schicht 2 wird je Kandidat die Programm-Detailseite bzw. die verlinkte Richtlinie
ausgewertet. Diese Inhalte liefern die Details, die im XML-Kurzdatensatz fehlen
(genaue Antragsberechtigung, Förderquote, Fristen, Kombinierbarkeit).

### 3.4 Rechtliches und Zukunftssicherheit

- Im Report ist die **Quellennennung** gemaess CC BY 4.0 verpflichtend (Kurzhinweis
  "Datenbasis: Förderdatenbank des Bundes, CC BY 4.0" plus Stand/Datum).
- Die Förderdatenbank soll perspektivisch in die **"Förderzentrale Deutschland"** ueberfuehrt
  werden. Der Datenzugang kann sich also aendern. Konsequenz fuer die Architektur: die
  Datenquelle wird hinter einem **Adapter** gekapselt (§10), damit ein Quellwechsel nur
  diesen Adapter betrifft, nicht das ganze Modul.

### 3.5 Ergaenzende Quellen (optional, spaetere Phase)

Fuer besonders relevante Programme koennen programmspezifische Quellen ergaenzt werden
(z. B. ZIM, BSFZ/Forschungszulage, BAFA, KfW, Landesförderinstitute). Start bewusst nur mit
der Förderdatenbank, um Umfang und Pflegeaufwand klein zu halten.

---

## 4. Schicht 1 - Matching-Logik

### 4.1 Firmenprofil aus PZE

PZE kennt jede Kundenfirma bereits - das ist der strukturelle Vorsprung gegenueber jeder
generischen Suche. Fuer das Matching relevant:

| Merkmal | Quelle in PZE | Nutzung im Matching |
|--------|---------------|---------------------|
| Bundesland / Sitz | v7_client_companies | Regionale Eignung (Bund/Land) |
| Unternehmensgroesse / KMU-Status | Stammdaten (MA-Zahl, ggf. Umsatz) | KMU-Programme, Bonusstufen |
| Branche / Taetigkeitsfeld | Stammdaten / Projektthemen | Thematische Eignung |
| Laufende Foerderformate | v7_projects.funding_format | Was wird schon genutzt / Kumulierung |
| Vorhabensart (FuE, Digitalisierung, Investition) | Projekt-/Beratungskontext | Foerderbereich-Fit |

Hinweis: Nicht alle Merkmale liegen heute strukturiert vor (z. B. Umsatz, exakte Branche/NACE).
Das Firmenprofil ist daher ein eigener kleiner Baustein, der ggf. um wenige Felder ergaenzt wird.

### 4.2 Programm-Attribute aus dem XML

Aus dem Export werden die filterbaren Attribute normalisiert (finale Feldnamen gemaess
Schnittstellenbeschreibung in Phase 0 zu verifizieren):

- Förderart (Zuschuss / Darlehen / Buergschaft / Beteiligung / steuerlich)
- Fördergebiet / Region (Bund, konkretes Land, EU)
- Förderberechtigte (KMU, Grossunternehmen, Startups, Branche)
- Förderbereich / Thema (FuE, Digitalisierung, Energie, Investition, ...)
- Förderhöhe / -quote (soweit im Datensatz enthalten)
- Fristen / Status (laufend, Stichtag, ausgesetzt)

### 4.3 Matching- und Scoring-Regeln

Zweistufig, damit die Shortlist kurz und begruendet ist:

- **Harte Ausschlusskriterien** (K.o.): falsche Region, Zielgruppe ausgeschlossen, Programm
  ausgesetzt/ausgelaufen. -> fliegt raus.
- **Weiches Ranking** (Score 0-100): Thema-Fit, Passung Förderart zum Vorhaben, Förderhöhe,
  Frist-Naehe (bald auslaufend = hoehere Prioritaet), Neuheit. Gewichtung konfigurierbar.

### 4.4 Ergebnis

Eine **priorisierte Shortlist je Mandant** (Vorschlag: Top 5-15) mit Score und einer kurzen,
nachvollziehbaren Begruendung je Treffer ("passt, weil KMU in NRW + FuE + Zuschuss, Frist
30.09."). Diese Liste ist der Uebergabepunkt an Schicht 2.

### 4.5 Umgang mit Datenluecken

Wo das XML ein Kriterium nicht strukturiert hergibt, wird im Matching nicht hart
ausgeschlossen, sondern als "zu pruefen" markiert und in Schicht 2 aufgeloest.

---

## 5. Schicht 2 - Tiefe und Steckbrief

### 5.1 Automatisch erzeugter Steckbrief je Programm

Fuer jeden Shortlist-Kandidaten wird die Detailseite/Richtlinie ausgewertet und ein
strukturierter Steckbrief erzeugt:

- Kurzbeschreibung und Ziel des Programms
- Wer ist antragsberechtigt (praezise)
- Was wird gefördert (foerderfaehige Kosten)
- Förderquote und Höchstbeträge
- Fristen und Verfahren (ein-/zweistufig, laufend/Stichtag)
- Kombinierbarkeit / Kumulierung, De-minimis-Relevanz
- Antragsweg und zustaendige Stelle
- Quelle + Stand (Datum der letzten Pruefung)

### 5.2 Eignungsbewertung gegen die konkrete Firma

Zusaetzlich zum Steckbrief eine Einschätzung **relativ zur Firma**: "passt / bedingt / passt
nicht" mit Begruendung und offenen Punkten (was noch zu klaeren ist). Das ist der eigentliche
Beratungskern, der bisher pro Programm von Hand entsteht.

### 5.3 Automatisierungsgrad: Human in the loop

Weil es sich um **bezahlte Beratung mit Haftungsrelevanz** handelt, ist der KI-erzeugte
Steckbrief immer ein **Entwurf**, den der Berater prueft und freigibt, bevor er in den
Kunden-Report geht. Damit werden Recherchezeit drastisch gesenkt und die fachliche
Verantwortung bleibt beim Berater. (Der genaue Automatisierungsgrad ist eine der offenen
Entscheidungen, §13.)

### 5.4 Vertrauens- und Aktualitaetsstempel

Jeder Steckbrief traegt Quell-Link und "zuletzt geprueft"-Datum. Das schuetzt vor veralteten
Aussagen und macht den Report gegenueber dem Kunden belastbar.

---

## 6. Monitoring und Alerts

### 6.1 Mechanik

- **Periodischer Re-Import** des XML-Vollbestands (z. B. woechentlich) -> Abgleich gegen den
  in PZE gespiegelten Stand.
- **RSS-Auswertung** (haeufiger, z. B. taeglich) fuer schnelle Signale.

### 6.2 Erkannte Ereignisse

Neues Programm, geaenderte Frist, **Antragsstopp** (wie ZIM), Auslaufen, geaenderte Konditionen.

### 6.3 Benachrichtigung

Ein **Digest** fuer die Berater, idealerweise bereits **je Mandant gefiltert** ("relevant fuer
Firma X: Programm Y neu, Programm Z Frist in 14 Tagen"). So wird aus Monitoring direkt
Beratungsanlass.

### 6.4 Umsetzung

Ueber **geplante Aufgaben** (scheduled tasks) - Import-Job, RSS-Job, Digest-Erzeugung laufen
zeitgesteuert im Hintergrund.

---

## 7. Der Kunden-Report (verkaufbares Ergebnis)

### 7.1 Aufbau

1. Deckblatt: Firma, Datum, Ansprechpartner
2. Executive Summary: die 1-3 stärksten Empfehlungen auf einen Blick
3. Shortlist-Tabelle: Programm, Ebene, Förderart, Quote/Höhe, Frist, Eignung
4. Steckbriefe je empfohlenem Programm (§5.1)
5. Empfehlung und naechste Schritte (inkl. Antragsweg, ggf. Cubintec-Leistung)
6. Quellen-/Standhinweis (CC BY 4.0)

### 7.2 Formate

- **Kundengerichtet:** PDF oder Word (Cubintec-Layout) - das bezahlte Ergebnis.
- **Berateransicht:** interaktiv im PZE-Berater-Portal (Shortlist filtern, Steckbriefe
  bearbeiten, Report erzeugen).

### 7.3 Verknuepfung zum FZul- und Kapazitaets-Modul

Faellt ein Zuschussprogramm aus (z. B. ZIM), verweist der Report automatisch auf die
**Forschungszulage** als tragende Alternative (Bruecke zum FZul-Modul) sowie ggf. auf
passende Landesprogramme. De-minimis-/Kumulierungsfragen (Backlog A-007) haengen hier an.

---

## 8. Einordnung ins PZE-Berater-Portal

- Neues Modul **"Förder-Radar"** im **Berater-Portal** (blau), analog zu Kapazitaetsplanung/FZul.
  Kein Firmen-Portal-Zugang in der ersten Phase - es ist ein Beraterwerkzeug, dessen Ergebnis
  (Report) an den Kunden geht.
- **Per-Firma-Ansicht** (Radar fuer eine Firma) plus **firmenuebergreifende Uebersicht**
  ("wo gibt es aktuell den groessten Handlungsbedarf?").
- Wiederverwendung vorhandener Bausteine: Firmenstammdaten, Bundesland, Projekt-/Förderformate
  sind bereits in PZE vorhanden.

---

## 9. Datenmodell (Vorschlag, DEV zuerst)

Neue Tabellen, Berater-scoped via RLS analog zum FZul-Modul. Feinschliff bei der Umsetzung.

| Tabelle | Zweck |
|--------|-------|
| `v7_foerder_programme` | Spiegel des XML-Bestands (normalisierte Attribute, Quelle, `last_seen`, Status) |
| `v7_foerder_steckbriefe` | Angereicherte Tiefe je Programm (KI-Entwurf + Berater-Fassung, `geprueft_am`, `geprueft_von`) |
| `v7_foerder_matches` | Firma x Programm: Score, Begruendung, Status (Vorschlag/geprueft/empfohlen/verworfen) |
| `v7_foerder_reports` | Erzeugte Kunden-Reports je Firma (Zeitpunkt, Auswahl, Datei) |
| `v7_foerder_events` | Monitoring-Ereignisse (neu/Frist/Stopp/Auslauf) fuer Alerts + Historie |

Firmenprofil-Felder, die evtl. neu gebraucht werden (Umsatz, Branche/NACE), werden minimal
zu `v7_client_companies` ergaenzt - erst wenn das Matching sie wirklich verlangt.

---

## 10. Architektur und Datenfluss

```
                 foerderdatenbank.de
                 (XML-Export + RSS)
                        │
                 [ Quellen-ADAPTER ]   <- kapselt die Quelle (zukunftssicher)
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                 ▼
  Import-Job      RSS-Monitor       Anreicherung (LLM)
 (XML -> DB)     (Events -> DB)     (Detailseite -> Steckbrief-Entwurf)
        │               │                 │
        └──────► v7_foerder_* (Supabase) ◄┘
                        │
             Matching-Service (Firmenprofil x Programme)
                        │
        Berater-Portal (Förder-Radar) ── Report-Generator (PDF/Word)
                        │
                 Digest / Alerts (scheduled tasks)
```

**Hosting - offene Entscheidung:** Entweder der bestehende Render-Prototyp wird zum
Ingest-/Anreicherungs-Dienst ausgebaut und PZE liest dessen Ergebnisse, oder alles wird
direkt in den PZE-Stack integriert (Next.js API-Routen + Supabase, wie der Rest von PZE).
Empfehlung tendenziell Integration, um eine Codebasis und ein Rechte-/Datenmodell zu haben;
finale Klaerung mit Cornelius (§13).

---

## 11. Recht und Qualitaet

- **Quellennennung** (CC BY 4.0) in jedem Report und in der App.
- **Beratungshaftung:** Der Report ist Entscheidungsvorbereitung, keine verbindliche
  Rechts-/Steuerberatung; Stand- und Quellenangaben, Berater-Freigabe vor Auslieferung.
- **KI-Entwuerfe** werden nie ungeprueft an Kunden gegeben (Human in the loop, §5.3).
- Keine personenbezogenen Daten der Kundenfirmen verlassen PZE; die Förderdaten selbst sind
  oeffentlich.

---

## 12. Umsetzungsreihenfolge (Phasen)

**Phase 0 - Vorklaerung:**
1. XML-Schnittstellenbeschreibung auswerten (echte Feldnamen/Struktur), RSS-Format pruefen.
2. Cornelius' Prototyp analysieren: was ist schon da (Import, UI), was ist wiederverwendbar.
3. Hosting-Entscheidung (Render-Ausbau vs. PZE-Integration).

**Phase 1 - Datenbestand + einfache Suche:**
4. XML-Import in `v7_foerder_programme` (+ periodischer Re-Import).
5. Filterbare Programmsuche im Berater-Portal (ohne Firmenbezug) - ersetzt/erweitert den
   heutigen Monitor.

**Phase 2 - Matching:**
6. Firmenprofil-Felder finalisieren.
7. Matching-/Scoring-Service -> priorisierte Shortlist je Mandant mit Begruendung.

**Phase 3 - Tiefe:**
8. Steckbrief-Anreicherung (LLM-Entwurf aus Detailseite/Richtlinie).
9. Berater-Kuratierung (bearbeiten/freigeben), Vertrauensstempel.

**Phase 4 - Report:**
10. Report-Generator (PDF/Word, Cubintec-Layout) + FZul-/Landesprogramm-Verknuepfung.

**Phase 5 - Monitoring:**
11. RSS + Re-Import -> Events -> mandantengefilterter Digest (scheduled tasks).

Grobe Groessenordnung: vergleichbar mit dem FZul-Modul, aber breiter - realistisch mehrere
Sessions je Phase. Phasen 1-2 liefern bereits einen spuerbaren Mehrwert (personalisierte
Shortlist) und sollten zuerst kommen.

---

## 13. Offene Entscheidungen (zu klaeren mit Cornelius und Katrin)

| # | Frage | Optionen / Hinweis |
|---|-------|--------------------|
| 1 | Automatisierungsgrad Schicht 2 | Voll-Automatik vs. KI-Entwurf + Berater-Freigabe (empfohlen wg. Haftung) |
| 2 | Hosting | Render-Prototyp ausbauen vs. in PZE (Next.js + Supabase) integrieren (Empfehlung) |
| 3 | Report-Umfang und Preismodell | Pauschale vs. je Report vs. Teil eines Beratungspakets |
| 4 | Datenquellen | Nur Förderdatenbank (Start) vs. spaeter programmspezifische Quellen ergaenzen |
| 5 | Firmen-Portal-Sichtbarkeit | Zunaechst nur Berater-Werkzeug; Kunden-Self-Service spaeter? |
| 6 | Firmenprofil-Ausbau | Welche Felder (Umsatz, Branche/NACE) werden fuers Matching wirklich gebraucht |

---

## 14. Zusammenfassung

Der Fördermonitor wird vom Datenspiegel zum Beratungsprodukt: Auf Basis des offiziellen,
frei nutzbaren XML-Exports (CC BY 4.0) matcht PZE die rund 2.500 Programme gegen das bereits
vorhandene Firmenprofil (Schicht 1), reichert die wenigen Treffer zu geprueften Steckbriefen
mit Eignungsbewertung an (Schicht 2) und liefert dem Kunden einen verkaufbaren Förder-Report.
Ein Monitoring ueber RSS und Re-Import macht aus Aenderungen wie dem ZIM-Stopp automatisch
Beratungsanlaesse. Der Vorsprung gegenueber jeder generischen Suche ist das Firmenwissen, das
in PZE ohnehin steckt - und die Tiefe, die heute pro Programm von Hand erarbeitet wird.

---

*Datenbasis fuer das Modul: Förderdatenbank des Bundes (foerderdatenbank.de), Lizenz CC BY 4.0.
Dieses Dokument ist ein Erstentwurf (v0.1) und dient als Diskussionsgrundlage.*
