# KONZEPT: Fördermonitor - Kundenspezifisches Förder-Matching (FMM)

**Version:** 0.2 (Ist-Stand des Prototyps eingearbeitet)
**Datum:** 13. Juli 2026
**Status:** Entwurf - zur Abstimmung mit Cornelius und Katrin
**Betrifft:** PZE V7, neues Berater-Modul; baut auf dem bestehenden Fördermonitor-Prototyp auf (foerdermonitor.onrender.com, "Fördermonitor | Cubintec")
**Verwandt:** KONZEPT-MULTIPROJEKT-FZUL v1.2, KONZEPT-KAPAZITAETSPLANUNG v1.1 (FZul als eine Zielförderung)

### Änderungen gegenüber v0.1
- Ist-Stand des Prototyps aus den Screenshots (13.07.2026) eingearbeitet.
- Erkenntnis: Import, KI-Klassifizierung, Monitoring, Deep-Dive-Crawler und automatische Vertriebs-Entwürfe sind bereits gebaut. Das Konzept verschiebt sich von "bauen" zu **"vertiefen + mit PZE verzahnen + Report"**.
- Kernlücken neu geschärft: Matching-Tiefe, Kundendaten-Quelle (heute `kunden_profile.json`/Lexware statt PZE), verkaufbarer Report, Datenqualität.

---

## 1. Motivation und Einordnung

### 1.1 Ausgangslage

Aktuelle Förderprogramme rechtzeitig zu finden und ihre Eignung für ein konkretes
Unternehmen zu beurteilen ist zunehmend aufwendig. Verschärfend: Das ZIM ist seit dem
7. Juli 2026 befristet ausgesetzt (Wiederaufnahme frühestens Anfang 2027) - die Suche nach
Alternativen wird selbst zur Beratungsleistung. Die offizielle Förderdatenbank ist breit
(~2.500 Programme), aber flach; man muss in jedes Programm einzeln einsteigen.

### 1.2 Zielbild und Geschäftsmodell

Kunden nutzen und bezahlen Cubintec dafür, dass wir ihnen die **optimale Förderung
beschaffen**. Der verkaufbare Wert ist das **Ergebnis**: eine kurze, geprüfte, auf das
jeweilige Unternehmen zugeschnittene Programm-Auswahl samt Einschätzung und nächsten Schritten -
nicht eine weitere Programmliste.

---

## 2. Ist-Stand des Prototyps (Stand 13.07.2026)

Der Fördermonitor ist bereits ein funktionierendes Werkzeug mit weit mehr Umfang als ein
Datenspiegel. Beobachteter Funktionsumfang:

| Funktion | Stand | Beleg / Beobachtung |
|----------|-------|---------------------|
| Import aus foerderdatenbank.de | vorhanden | "Automatisiert erfasst aus foerderdatenbank.de", Button "Export importieren", geplante Läufe ("Letzter Lauf 00:30 · 2 Fehler") |
| Deep-Dive-Crawler | vorhanden | Menü "Rahmenprogramme": Parent-Programm bündelt die spezifischen Aufrufe, "die der Deep-Dive-Crawler bei der zuständigen Institution findet" |
| KI-Klassifizierung (Themen-Tags) | vorhanden | Feste Taxonomie mit 11 Tags (#Advanced_Manufacturing, #Allgemeine_Innovation, #Circular_Bioeconomy, #Cybersecurity_und_Trust, #Digital_Infrastructure, #Health_und_LifeSciences, #KI_und_MachineLearning, #Mobility_und_Transport, #Quantum_und_Photonics, #Space_und_Earth_Observation, #Sustainable_Technology) |
| Zielgruppen-Klassifizierung | vorhanden | Unternehmen/KMU, Start-up/Gründung, Selbstständige/Freiberufler, Kommune/öffentlich, Hochschule/Forschung, Verein/Verband, Landwirtschaft, Privatpersonen |
| Geber/Region | vorhanden | Filter Bund / EU / alle 16 Länder |
| Status-Tracking inkl. Antragsstopp | vorhanden | Aktiv/Pausiert/Abgelaufen; ZIM korrekt als "Pausiert · Antragsstopp – aktuell ausgesetzt"; manuelle Übersteuerung, die den Re-Import überlebt |
| Änderungs-Monitoring | vorhanden | Menü "Änderungen" |
| Kunden-Matching (Tag-basiert) | vorhanden, aber flach | Abgleich der Interessen-Hashtags aus `kunden_profile.json` mit den KI-Tags; Demo-Kunden mit "984 / 610 / 469 offene Treffer" |
| Kundendaten-Quelle | extern | `kunden_profile.json` bzw. Button "Aus Lexware laden" - **nicht** PZE |
| Programm-Detail | vorhanden | Beschreibung, Förderhöhe, Projektträger, Bekanntmachung-Link, "Passende Kunden" |
| Deep-KI (Tiefenanalyse je Aufruf) | teilweise | Spalte/Schalter "Deep-KI" in der Aufrufliste |
| Automatische Vertriebs-Entwürfe | vorhanden | Bei Förderhöhe "Unbekannt" generiert die KI eine Anfrage an den Projektträger, abgelegt als Outlook-Entwurf via "Microsoft Graph · Mail.ReadWrite"; "Senden gesperrt", Mensch versendet |
| Ansichten Tabelle/Karten/Kompakt | vorhanden | - |

**Fazit:** Ingestion, Klassifizierung, Monitoring, Detailtiefe-Anfragen und Cubintec-Branding
sind bereits da. Der Prototyp ist eine solide Basis, kein leeres Blatt.

---

## 3. Lückenanalyse - wo der echte Mehrwert entsteht

### 3.1 Matching-Tiefe (Hauptlücke)

Das Matching ist heute **rein Tag-basiert**: Interessen-Hashtags der Firma gegen die KI-Tags
des Aufrufs. Ergebnis sind hunderte Treffer je Kunde (984/610/469) - ein Themenfilter, keine
Empfehlung. Es fehlen die harten Eignungskriterien, die aus 984 Treffern eine Top-10-Shortlist
machen:

- **Region:** Geber (Bund/EU/konkretes Land) gegen den Firmensitz. Landesprogramme passen nur
  zum jeweiligen Bundesland. (Daten sind da, werden im Matching aber nicht genutzt.)
- **Zielgruppe/KMU-Eignung:** Programm-Zielgruppe gegen die tatsächliche Unternehmensform/-größe.
- **Förderart und -höhe:** passt Zuschuss/Darlehen/steuerlich zum Vorhaben; Relevanz der Höhe.
- **Genutzte Förderformate / Kumulierung:** was die Firma schon nutzt (aus PZE), De-minimis.
- **Fristnähe und Aktualität:** bald auslaufende Programme priorisieren.
- **Scoring/Ranking:** gewichtete Kombination -> kurze, begründete Shortlist statt Trefferliste.

### 3.2 Kundendaten-Quelle (die eigentliche Verzahnung)

Heute kommen die Kundenprofile aus `kunden_profile.json` bzw. Lexware - ein statischer
Hashtag-Satz. PZE kennt jede Firma **strukturell tiefer**: Bundesland, Unternehmensform,
laufende Projekte und Förderformate, Themen. Der große Hebel ist, das Matching an die realen
PZE-Firmenprofile zu koppeln (ggf. ergänzt um Lexware-Stammdaten).

### 3.3 Verkaufbarer Report (fehlt)

Der Output ist heute eine Bildschirm-Trefferliste plus Vertriebs-Entwürfe. Das eigentliche
Produkt - ein kundenspezifischer, geprüfter **Förder-Report** - fehlt noch.

### 3.4 Datenqualität

Viele aktive Programme zeigen Förderhöhe "Unbekannt" und Deadline "k.A." (deshalb die
Vertriebs-Entwürfe als Behelf). Im AFP-Detail widersprechen sich Kopf ("Hessen") und Text
("Mecklenburg-Vorpommern") - es braucht Plausibilitäts-/Qualitätsprüfungen und einen
Vertrauens-/Standstempel je Datensatz.

---

## 4. Kernprinzip: zwei Schichten (auf den Ist-Stand gemappt)

```
Förderdatenbank (Export + Deep-Dive-Crawler)      [VORHANDEN]
        ▼  Import + KI-Klassifizierung (Tags/Zielgruppe/Geber)  [VORHANDEN]
[ Schicht 1: MATCHING ]
   heute: nur Tags -> 984 Treffer                 [FLACH -> VERTIEFEN]
   Ziel:  Tags + Region + Zielgruppe + KMU + Förderart + Scoring
        ▼
Shortlist je Mandant (Top 5-15, mit Score + Begruendung)   [NEU]
        ▼
[ Schicht 2: TIEFE ]  Deep-KI-Steckbrief + Eignungsbewertung
   heute: Deep-KI-Schalter, Detail teils "Unbekannt"  [TEILWEISE -> VERTIEFEN]
        ▼  KI-Entwurf -> Berater-Freigabe (Human in the loop)
Kunden-Report (verkaufbares Ergebnis)             [NEU]

[ MONITORING ]  Änderungen + Status/Antragsstopp   [VORHANDEN]
[ DATENLUECKEN ] Vertriebs-Entwürfe an Projektträger [VORHANDEN]
```

---

## 5. Matching-Vertiefung (Schicht 1) - der Kern des Ausbaus

### 5.1 Firmenprofil aus PZE

| Merkmal | Quelle in PZE | Nutzung im Matching |
|--------|---------------|---------------------|
| Bundesland / Sitz | v7_client_companies | Region: Bund/EU immer, Land nur passend |
| Unternehmensform / Größe (KMU) | Stammdaten (+ ggf. Lexware) | Zielgruppen-Eignung, KMU-Bonusstufen |
| Branche / Themen | Projektthemen, Tags | Themen-Fit (heute schon vorhanden) |
| Laufende Förderformate | v7_projects.funding_format | Kumulierung, De-minimis, was fehlt noch |
| Vorhabensart | Projekt-/Beratungskontext | Förderbereich-Fit |

### 5.2 Scoring

Zweistufig: **harte Ausschlusskriterien** (falsche Region, Zielgruppe ausgeschlossen,
ausgesetzt/abgelaufen) filtern grob; **weiches Ranking** (Themen-Fit, Förderart, -höhe,
Fristnähe, Neuheit) sortiert den Rest. Gewichtung konfigurierbar. Ergebnis: statt 984 eine
priorisierte, begründete Shortlist ("passt, weil KMU in NRW + FuE + Zuschuss, Frist 30.09.").

---

## 6. Schicht 2 - Tiefe und Steckbrief

Der vorhandene "Deep-KI"-Mechanismus wird zum verlässlichen **Steckbrief** ausgebaut: je
Shortlist-Kandidat strukturiert Antragsberechtigung, förderfähige Kosten, Quote/Höchstbetrag,
Fristen/Verfahren, Kombinierbarkeit/De-minimis, Antragsweg, Quelle + "geprüft am". Dazu eine
**Eignungsbewertung** relativ zur Firma ("passt / bedingt / nicht" + Begründung + offene
Punkte). Weil es bezahlte, haftungsrelevante Beratung ist, bleibt der KI-Output ein **Entwurf
mit Berater-Freigabe** (Human in the loop).

Die bestehenden **Vertriebs-Entwürfe** (Anfrage an den Projektträger bei fehlender Förderhöhe)
sind hier ein wertvoller Baustein zur Datenanreicherung und bleiben erhalten.

---

## 7. Der Kunden-Report (verkaufbares Ergebnis, NEU)

**Aufbau:** Deckblatt (Firma, Datum, Ansprechpartner) · Executive Summary (1-3 stärkste
Empfehlungen) · Shortlist-Tabelle (Programm, Ebene, Förderart, Quote/Höhe, Frist, Eignung) ·
Steckbriefe je Empfehlung · Empfehlung & nächste Schritte (inkl. Cubintec-Leistung) ·
Quellen-/Standhinweis (CC BY 4.0).

**Formate:** kundengerichtet als PDF/Word (Cubintec-Layout, das bezahlte Ergebnis);
Berateransicht interaktiv (Shortlist filtern, Steckbriefe freigeben, Report erzeugen).

**Verknüpfung:** Fällt ein Zuschuss aus (ZIM), verweist der Report automatisch auf die
**Forschungszulage** (Brücke zum FZul-Modul) und passende Landesprogramme.

---

## 8. Datenquelle und Recht

- **Basis:** offizieller XML-Vollexport der Förderdatenbank, Lizenz **CC BY 4.0**
  (Weiterverbreitung mit Namensnennung). Zusätzlich der Deep-Dive-Crawler für die spezifischen
  Aufrufe und ein RSS-Feed für Aktualität.
- **Quellennennung** im Report verpflichtend ("Datenbasis: Förderdatenbank des Bundes,
  CC BY 4.0" + Stand).
- **Zukunftssicherheit:** Die Förderdatenbank soll in die "Förderzentrale Deutschland"
  überführt werden -> Datenquelle hinter einem Adapter kapseln.
- **Beratungshaftung:** Report als Entscheidungsvorbereitung, keine verbindliche Rechts-/
  Steuerberatung; Berater-Freigabe vor Auslieferung.
- **Vertriebs-Entwürfe:** bleiben "Draft only" (kein Mail.Send-Recht), Versand nur nach
  manueller Prüfung - gut so. Beim Ausbau auf reputations-/datenschutzkonforme Ansprache der
  Projektträger achten.

---

## 9. Architektur und Integration

Der Prototyp ist bereits eine eigenständige App (Render) mit Anbindungen an **Microsoft Graph**
(Outlook-Entwürfe) und **Lexware** (Kundenimport). Die zentrale Entscheidung ist daher **nicht
mehr "bauen oder nicht", sondern die Verzahnung mit PZE**:

- **Option A - Kopplung:** Fördermonitor bleibt die Ingestion-/Klassifizierungs-/Crawler-Engine;
  PZE liefert die echten Firmenprofile (statt `kunden_profile.json`) und erzeugt den Report.
  Schnittstelle Fördermonitor ↔ PZE (Profile rein, Matches/Steckbriefe raus).
- **Option B - Integration:** Die Fördermonitor-Logik wandert in den PZE-Stack (Next.js +
  Supabase, Berater-Portal), eine Codebasis, ein Rechte-/Datenmodell. Aufwendiger, aber
  einheitlich.

Empfehlung als Startpunkt: **Option A** (schneller Nutzen: reale PZE-Profile ins bestehende
Matching), mit Option B als mögliches Ziel. Klärung mit Cornelius.

---

## 10. Umsetzungsreihenfolge (revidiert)

**Phase 0 - Ist-Aufnahme mit Cornelius:** Code-/Datenmodell des Prototyps sichten; wie werden
`kunden_profile.json`/Lexware und Deep-KI heute genau genutzt; Schnittstellenoptionen zu PZE.

**Phase 1 - Matching-Tiefe:** harte Kriterien (Region, Zielgruppe/KMU) + Scoring ergänzen ->
aus Trefferlisten werden Shortlists. (Bringt sofort spürbaren Mehrwert, auch ohne PZE-Kopplung.)

**Phase 2 - PZE-Profile anbinden:** reale Firmenprofile (Bundesland, Förderformate, Themen) aus
PZE ins Matching statt/zusätzlich zu `kunden_profile.json`.

**Phase 3 - Steckbrief-Tiefe:** Deep-KI zu verlässlichen Steckbriefen + Eignungsbewertung
ausbauen; Datenqualitäts-/Plausibilitätsprüfungen.

**Phase 4 - Report:** kundenspezifischer Förder-Report (PDF/Word) + FZul-/Landesprogramm-Bezug.

**Phase 5 - Feinschliff Monitoring/Alerts:** mandantengefilterter Digest aus "Änderungen".

---

## 11. Offene Entscheidungen (mit Cornelius und Katrin)

| # | Frage | Hinweis / Tendenz |
|---|-------|-------------------|
| 1 | Verzahnung PZE ↔ Fördermonitor | Option A (Kopplung) als Start, B (Integration) als Ziel |
| 2 | Kundendaten-Quelle | PZE-Profile führend; Lexware als Ergänzung (Stammdaten) |
| 3 | Automatisierungsgrad Steckbrief | KI-Entwurf + Berater-Freigabe (Haftung) |
| 4 | Report-Umfang & Preismodell | Pauschale / je Report / Teil eines Beratungspakets |
| 5 | Vertriebs-Entwürfe an Projektträger | beibehalten; Ansprache-Policy und Frequenz festlegen |
| 6 | Datenqualität | Plausibilitätsregeln + Vertrauens-/Standstempel je Programm |

---

## 12. Zusammenfassung

Der Fördermonitor ist bereits eine leistungsfähige Ingestion-, Klassifizierungs- und
Monitoring-Maschine mit Deep-Dive-Crawler und automatischer Datenanreicherung - stärker als
zunächst angenommen. Der Ausbau zum verkauften Beratungsprodukt hat drei Hebel: das flache,
Tag-basierte Matching um Region, Zielgruppe, KMU-Eignung und Scoring **vertiefen** (aus 984
Treffern eine Top-10-Shortlist); die Kundendaten von `kunden_profile.json`/Lexware auf die
realen **PZE-Firmenprofile** heben; und den kundenspezifischen **Förder-Report** als
verkaufbares Ergebnis ergänzen. Ingestion und Monitoring sind gelöst - der Wert entsteht jetzt
in Tiefe, Verzahnung und Ergebnis.

---

*Datenbasis: Förderdatenbank des Bundes (foerderdatenbank.de), CC BY 4.0. Entwurf v0.2,
Ist-Stand aus Screenshots vom 13.07.2026. Diskussionsgrundlage für die Runde mit Cornelius und Katrin.*
