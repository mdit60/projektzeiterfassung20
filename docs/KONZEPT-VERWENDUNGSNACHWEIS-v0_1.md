# KONZEPT - Verwendungsnachweis (VN) im ZA-Bereich

**Version:** 0.1 (Entwurf zur Abstimmung)
**Datum:** 29.07.2026
**Status:** Vorschlag / noch nicht abgenommen
**Bezug:** Pflichtenheft Paragraph 6 (ZA-Modul), Paragraph 12e.5 (ZAPanel),
KONZEPT-FIRMA-COCKPIT, KONZEPT-KAPAZITAETSPLANUNG
**Ausloeser:** GL-Bedarf - fuer den Verwendungsnachweis muss je Projekt eine
Zusammenfassung aller Zahlungsanforderungen (ZA) erstellt werden.

---

## 1. Zweck und fachlicher Kontext

Der Verwendungsnachweis (VN) ist die projektweite Abrechnung gegenueber dem
Projekttraeger (VDI/VDE-IT). Er verdichtet, was ueber die Laufzeit in den
einzelnen ZAs (periodische Mittelabrufe) angefallen ist, und besteht aus zwei
Teilen:

- **Sachbericht** (Freitext: Ergebnisse, Arbeitspakete, ggf. Erfolgskontrolle).
- **Zahlenmaessiger Nachweis** (Kostenzusammenstellung, Zuwendung, Berichtszeitraum).

Entscheidend fuer die Umsetzung: Der zahlenmaessige Teil ist ueberwiegend eine
**Aggregation ueber die bereits vorhandenen ZAs** - foerderfaehige Kosten,
Foerderbetrag (`foerderbetrag_gesamt`), Zeitraum und Zahlungseingang liegen je ZA
schon in `v7_zahlungsanforderungen`; die Kosten kommen aus den Timesheets. Der VN
ist damit kein neues Rechenwerk, sondern ein Rollup plus Sachbericht-Erfassung.

Bestaetigt (GL, 29.07.2026):
1. Es gibt **fuenf** VN-Varianten (siehe Paragraph 2).
2. Beim **Zwischennachweis** sind **keine** Kosten-Zahlen gefordert (nur Sachbericht).
3. Auch bei der **DS** werden ZAs erstellt und die Mittel darueber abgerufen -
   die Aggregation "alle ZA" gilt also einheitlich fuer alle Formate.

---

## 2. Die fuenf VN-Varianten und ihre System-Zuordnung

Ausgelesen aus den fuenf Musterformularen (XFA, VDI/VDE-IT):

| Variante | Formular_ID | Formular-Version | Zuordnung im System |
|----------|-------------|------------------|---------------------|
| Einzel-/Kooperationsprojekt | VDIVDE_VN_EP_Koop | 3.02 | funding_format = ZIM |
| DS nach AGVO | VDIVDE_VN_DS | 3.03 | funding_format = ZIM_DS, Beihilfebasis = AGVO |
| DS De-minimis (ohne AGVO) | VDIVDE_VN_DS_oAGVO | 3.00 | funding_format = ZIM_DS, Beihilfebasis = De-minimis |
| Netzwerk Phase 1 | VDIVDE_VN_PH1 | 3.00 | funding_format = ZIM_NETZWERK, Phase 1 |
| Netzwerk Phase 2 | VDIVDE_VN_PH2 | 3.00 | funding_format = ZIM_NETZWERK, Phase 2 |

Die richtige Variante ergibt sich **automatisch** aus drei Merkmalen:
- `funding_format` (ZIM / ZIM_DS / ZIM_NETZWERK) - existiert bereits.
- **Beihilfebasis** (AGVO vs. De-minimis) - unterscheidet die beiden DS-Formulare;
  Feld existiert noch nicht (siehe Paragraph 6, offener Punkt O-1).
- **Netzwerk-Phase** (1 / 2) - im NWM-Modul bereits ueber die Foerdersatz-Stufen
  bekannt (Pflichtenheft Paragraph 7.3), ableitbar.

Die Formular-Version (z.B. DS 3.03 vs. DS_oAGVO 3.00) wird pro Variante als
Konstante hinterlegt, damit das Feld-Mapping versioniert bleibt (VDI/VDE aendert
die Formulare gelegentlich).

---

## 3. Zwischen- vs. Schlussnachweis (Modus, keine eigene Variante)

Der Zwischen-/Schlussnachweis ist **dasselbe Formular** in zwei Modi:

| Modus | Sachbericht | Zahlenmaessiger Nachweis |
|-------|-------------|--------------------------|
| Zwischennachweis | ja | NEIN (keine Kosten-Zahlen gefordert) |
| Schlussnachweis | ja | ja - Zusammenfassung ALLER ZA |

In der VN-Ansicht ist der Modus ein Umschalter. Im Zwischen-Modus wird der
zahlenmaessige Block ausgeblendet; im Schluss-Modus erscheint die volle
ZA-Aggregation. Der Berichtszeitraum ist frei waehlbar (Zwischennachweise decken
i.d.R. ein Jahr ab, der Schlussnachweis die Gesamtlaufzeit) - er ist damit
potenziell eine Teilmenge der ZAs, nicht zwingend "alle".

---

## 4. Integration in die Oberflaeche

Die ZA-Ansicht (ZAPanel) arbeitet immer auf **einer** ZA. Der VN liegt eine Ebene
hoeher (ganzes Projekt, mehrere ZAs). Deshalb **keine** neue ZAPanel-Registerkarte,
sondern eine eigene projektbezogene VN-Ansicht mit zwei Einstiegen auf dieselbe Seite:

1. **Separate Kachel "Verwendungsnachweis"** im Cockpit (Empfehlung als
   Primaer-Einstieg) - konsequent zum bestehenden Kachel-Muster
   (Cockpit | Fortschritt | Stundennachweis). Der VN ist ein eigenstaendiges
   Abgabedokument und verdient eine eigene Kachel.
2. **Knopf "Verwendungsnachweis"** im Kopf der ZA-Liste (Deep-Link auf dieselbe
   Seite), damit er direkt aus dem ZA-Kontext erreichbar ist.

Beide Wege oeffnen die gleiche Komponente (analog dem Deep-Link-Muster aus
Session 47, ZAPanel). Die Variante wird automatisch bestimmt (Paragraph 2), der
Modus per Umschalter (Paragraph 3) gewaehlt.

---

## 5. Inhalt der VN-Seite

| Block | Quelle | Nur Schlussnachweis? |
|-------|--------|----------------------|
| Kopfdaten: FKZ, Kurzbezeichnung, Bescheid-Datum, Vertretungsberechtigter, Variante, Berichtszeitraum | Projekt-Stammdaten + Auswahl | nein |
| ZA-Uebersicht: je ZA Nr, Zeitraum, foerderfaehige Kosten, Foerderbetrag, Status, Zahlungseingang - mit Summenzeile | v7_zahlungsanforderungen des Projekts | ja |
| Kostenarten-Aufstellung (Personalkosten, Gemeinkosten/Pauschale, Fremdleistungen ...), summiert ueber alle ZAs im Zeitraum | Timesheets / ZA-Kostenlogik | ja |
| Abgleich Foerderung: Summe Foerderbetrag ggue. bewilligter Summe (Ausschoepfung/Rest) | vorhandene Felder | ja |
| Abgleich Auszahlung: Summe Zahlungseingang ggue. Foerderbetrag (offene Auszahlung) | zahlungseingang_betrag | ja |
| Sachbericht (mehrere Freitext-Bloecke gemaess Formular-Teilen) | neu, klein (siehe Paragraph 6) | nein |
| Ausgabe: feldgenaue Aufbereitung zum Uebertragen ins offizielle VN-Formular + Druck-/Excel-Anlage als Beleg | berechnet | - |

**Ausgabe-Philosophie** analog ZA-Modul (Pflichtenheft Paragraph 6.1: "Kein eigenes
PDF. Daten werden manuell in das offizielle VDI/VDE-IT Formular uebertragen"):
Die Seite bereitet die Werte feldgenau passend zur jeweiligen Formular-Variante
auf, sodass sie 1:1 uebertragen werden. Zusaetzlich eine druckbare Zusammenstellung
(bzw. Excel) als interner Beleg / zur Ablage.

---

## 6. Datenmodell

Minimaler Eingriff - die Zahlen werden gelesen/aggregiert, nicht gedoppelt.

**Neu: Tabelle `v7_verwendungsnachweise`** (nur Sachbericht + Metadaten):
- id
- project_id (FK)
- art: 'zwischen' | 'schluss'
- variante: EP_KOOP | DS_AGVO | DS_DEMINIMIS | NW_PH1 | NW_PH2 (abgeleitet, gespeichert)
- formular_version (z.B. '3.03')
- berichtszeitraum_von, berichtszeitraum_bis
- sachbericht_ergebnis (Text), sachbericht_arbeitspakete (Text), sachbericht_weiteres (Text)
- status: Entwurf | Fertig
- erstellt_am, aktualisiert_am

**Evtl. neu am Projekt: `beihilfe_basis`** ('agvo' | 'de_minimis'), falls nicht
schon anderswo hinterlegt - unterscheidet die beiden DS-Formulare (offener Punkt O-1).

**Kein** Doppeln der Kostenzahlen: Kosten, Foerderbetrag und Zahlungseingang
werden zur Anzeige aus `v7_zahlungsanforderungen` + Timesheets aggregiert.

---

## 7. Feld-Mapping (Beispiel DS De-minimis, aus WerftScan)

Konkret ausgelesen aus dem Muster (FKZ 16KN124595, WerftScan), zur Illustration
der Mapping-Tiefe. Vollstaendiger Katalog je Variante in Ausbaustufe.

| VN-Formularfeld | Bedeutung | System-Quelle |
|-----------------|-----------|---------------|
| Foerderkennzeichen | 16KN124595 | project.foerderkennzeichen |
| Kurzbezeichnung_DS | WerftScan | project.short_name |
| Datum_Zuwendungsbescheid | 26.08.2025 | project.bewilligung_datum |
| von_/bis_Berichtszeitraum | 01.09.2025 / 30.04.2026 | VN.berichtszeitraum_von/bis |
| Name_VB | Till Schulze-Hagenest | Vertretungsberechtigter der Firma |
| Tabelle6 (5 Kostenpositionen + Summe) | 52.786,28 / 15.835,88 / 0,00 / 14.168,63 / 4.250,59 = 87.041,38 | Aggregation Kostenarten ueber alle ZAs |
| Dezimalfeld1/2 | Foerdersatz 30 % | project / Foerderlogik |
| Teil1 Text | Sachbericht-Ergebnis | VN.sachbericht_ergebnis |
| Teil2/3 Arbeitspakete | AP-Beschreibung | VN.sachbericht_arbeitspakete |

Die genauen Kostenarten-Labels und ihre Zuordnung sind je Variante gegen die
offizielle Ausfuellhilfe zu verifizieren (offener Punkt O-2).

---

## 8. Verhaltensregeln (Entwurf, VN-01 ff.)

| Nr | Regel |
|----|-------|
| VN-01 | Variante wird automatisch aus funding_format + Beihilfebasis + Phase bestimmt, nicht manuell gewaehlt. |
| VN-02 | Modus Zwischen/Schluss per Umschalter; im Zwischen-Modus ist der zahlenmaessige Block ausgeblendet. |
| VN-03 | Zahlenmaessiger Nachweis aggregiert nur ZAs, deren Zeitraum in den Berichtszeitraum faellt. |
| VN-04 | Foerderbetrag je ZA aus gespeichertem foerderbetrag_gesamt (keine Neuberechnung historischer ZAs; vgl. ZA-06). |
| VN-05 | Abgleich zeigt Ausschoepfung (Summe Foerderbetrag / bewilligte Summe) und offene Auszahlung (Foerderbetrag / Zahlungseingang). |
| VN-06 | Sachbericht-Texte werden projektweise gespeichert und bleiben ueber Sessions erhalten. |
| VN-07 | Ausgabe erfolgt als feldgenaue Aufbereitung (manuelle Uebertragung) + druckbarer Beleg; kein automatischer Formular-Upload. |
| VN-08 | Aenderungen an ZAs (Kosten, Zahlungseingang) schlagen beim naechsten Oeffnen automatisch in den VN-Zahlen durch (Read-Rollup). |

---

## 9. Offene Punkte / Rueckfragen

- **O-1 Beihilfebasis (AGVO vs. De-minimis):** Ist das schon irgendwo am Projekt
  hinterlegt, oder legen wir das Feld `beihilfe_basis` neu an? (Steuert die Wahl
  zwischen VN_DS und VN_DS_oAGVO.)
- **O-2 Kostenarten je Variante:** Die genaue Zuordnung der Kostenpositionen
  (Personaleinzelkosten, Gemeinkosten-Pauschale, Fremdleistungen ...) zu unseren
  Timesheet-/ZA-Daten je Formularvariante gegen die offizielle Ausfuellhilfe
  festzurren.
- **O-3 Erfolgskontrollbericht (nur NW Phase 2):** Formular PH2 enthaelt einen
  zusaetzlichen Erfolgskontroll-Teil. Als weiteren Sachbericht-Block aufnehmen?
- **O-4 Ausgabeformat:** Reicht Druck (PDF via Browser, wie Stundennachweis) plus
  Bildschirm-Aufbereitung, oder zusaetzlich Excel-Anlage?
- **O-5 Sachbericht-Unterstuetzung:** Soll der Sachbericht rein manuell erfasst
  werden, oder mit Textbausteinen/Vorbelegung aus dem Projekt (Titel, AP-Liste)?

---

## 10. Umsetzungsstufen (Vorschlag)

- **MVP:** Kachel + VN-Seite fuer eine Variante (Vorschlag: DS De-minimis oder
  Einzel-/Koop, je nach dringlichstem Realfall), Schluss-Modus, ZA-Aggregation +
  Kopfdaten + Sachbericht-Freitext + Druckbeleg.
- **Stufe 2:** restliche vier Varianten inkl. Beihilfebasis-Feld und Phasen-Logik;
  Zwischen-Modus.
- **Stufe 3:** Feinschliff Feld-Mapping je Variante, Excel-Anlage, ggf.
  Erfolgskontrollbericht PH2, Sachbericht-Vorbelegung.

---

*Naechster Schritt: Freigabe der Richtung + Antworten zu O-1/O-2, dann Ausbau zu
v1.0 mit vollstaendigem Feld-Mapping je Variante und DB-Migrationsplan.*
