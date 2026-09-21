# KONZEPT - ZA-Korrekturen und Zahlungseingaenge

**Version:** 1.2 (Teil B umgesetzt, Etappe 3 offen)
**Datum:** 21.09.2026 (Session 88)
**Aenderungen gegenueber 1.1:** Stand der Umsetzung (Abschnitt 12); Etappen 1 und 2
erledigt und in PROD (V7.9.15); Freund-Schritt nach Etappe 2 erledigt; neue
Pflichtpunkte fuer Etappe 3 aus dem DEV-Test (12.3).
**Aenderungen gegenueber 1.0:** Entscheidungen zu den offenen Fragen eingearbeitet
(Abschnitt 10); Datum der Sammelueberweisung Freund korrigiert (13.03.26 laut
Kontoauszug); Unique-Regel in DEV und PROD geprueft (5.1); Vorgehen Freund ohne
Loeschen/Neuaufbau (6.1); neues DEV-Testdrehbuch (Abschnitt 11).
**Anlass:** Steuerkanzlei Freund / ANOVIA (16KN124596, ZIM DS)
**Status:** Etappen 1-2 (Teil B) umgesetzt, in PROD. Etappe 3 (Teil A) offen, erst nach GO Martin
**Grundlage Code:** ZAPanel v7.4.4-72, FirmaCockpit v7.4.9-36-16,
verwendungsnachweis-utils v1.2-7, VerwendungsnachweisPanel v1.2-6

---

## 1. Anlass

Bei ANOVIA wurde ZA 1 zunaechst nur mit den Stunden von Robin Freund eingereicht
(1.575 EUR). Danach wurden die Stunden von Carolin Schoebel nachgeschoben - als
manuell korrigierte ZA 1 (8.275 EUR), die nie in PZE erstellt wurde. Der Projekttraeger
hat die Restzahlung der Korrektur und ZA 2 in EINER Ueberweisung zusammengefasst.

| ZA | Zeitraum | eingereicht | Anforderung | Zahlung | Betrag |
|---|---|---|---|---|---|
| 1 (Original) | 01.11.25-31.01.26 | 02.02.26 | 1.575 | 27.02.26 | 1.575 |
| 1 (Korrektur) | 01.11.25-31.01.26 | 23.02.26 | 8.275 | 13.03.26 (Sammelueberweisung) | 12.128 |
| 2 | 01.02.26-28.02.26 | 03.03.26 | 5.428 | (in 12.128 enthalten) | |
| 3 | 01.03.26-30.04.26 | 07.05.26 | 15.391 | 29.05.26 | 15.391 |
| 4 | 01.05.26-30.06.26 | 07.07.26 | 14.784 | 28.07.26 | 14.784 |
| 5 | 01.07.26-31.08.26 | 09.09.26 | 14.593 | offen | |

Aufschluesselung der Sammelueberweisung vom 13.03.2026 (Kontoauszug Freund, VDI/VDE
Innovation + Technik GmbH): 8.275 - 1.575 = 6.700 (Rest Korrektur ZA 1) + 5.428 (ZA 2)
= 12.128 EUR. Zahlungseingaenge laut Kontoauszug: 27.02. 1.575 | 13.03. 12.128 |
29.05. 15.391 | 28.07. 14.784 = 43.878 EUR. (Die Arbeitstabelle nannte faelschlich den
25.10.26.)

In PZE steht heute: ZA 1 mit 8.275 angefordert / 1.575 gezahlt, ZA 2 mit 5.428
angefordert / 12.128 gezahlt. Summen stimmen, die Zuordnung nicht: Scheindifferenzen
+6.700 bei ZA 1 und -6.700 bei ZA 2. Die Original-ZA 1 und die Korrektur als Vorgang
sind nicht mehr nachvollziehbar.

## 2. Problem: zwei Annahmen, die im Sonderfall nicht halten

1. **Eine ZA-Nummer = genau eine Zeile.** Wird eine eingereichte ZA ersetzt, gibt es
   keinen Platz fuer die Version. Das Original wird ueberschrieben oder die Korrektur
   entsteht ausserhalb von PZE (Fall Freund) - dann fehlen auch Deckblatt und Anlagen
   aus PZE.
2. **Eine ZA = genau ein Zahlungseingang.** v7_zahlungsanforderungen hat genau ein
   Feldtripel zahlungseingang_datum / _betrag / _kommentar. Weder zwei Zahlungen auf eine
   ZA (Freund ZA 1: 1.575 + 6.700) noch eine Ueberweisung auf zwei ZA (12.128) lassen
   sich abbilden.

## 3. Leitprinzip

**Der Standardablauf bleibt unveraendert.** Eine ZA, ein Zahlungseingang - Eingabe und
Anzeige sehen aus wie heute. Die Sonderfaelle werden ermoeglicht, nicht erzwungen, und
sind nur ueber einen zusaetzlichen Schritt erreichbar.

Die beiden Teile sind unabhaengig und koennen getrennt umgesetzt werden. Teil B loest
das sichtbare Problem (falsche Differenzen) und kommt zuerst.

---

## 4. Teil B - Zahlungseingaenge als Liste (Etappe 1 und 2)

### 4.1 Datenmodell

Neue Tabelle `v7_za_zahlungen`:

| Spalte | Typ | Bedeutung |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK v7_projects | |
| za_nummer | int | ZA, auf die die Zahlung angerechnet wird (siehe 4.2) |
| datum | date | Zahlungseingang |
| betrag | numeric(12,2) | angerechneter Betrag |
| referenz | text null | verbindet Teile einer Sammelueberweisung |
| kommentar | text null | |
| is_active | boolean default true | weiches Loeschen, wie ueberall in PZE |
| created_at, created_by, updated_at | | Nachvollziehbarkeit |

RLS analog v7_zahlungsanforderungen.

### 4.2 Zahlung haengt an der ZA-NUMMER, nicht an der Version

Der Projekttraeger zahlt auf "ZA 1", gleich in welcher Fassung. Deshalb verweist eine
Zahlung auf (project_id, za_nummer), nicht auf die id einer ZA-Zeile. Wird ZA 1 spaeter
korrigiert (Teil A), gehoeren die bisherigen Zahlungen automatisch zur Korrektur - ohne
Umhaengen, ohne Migration.

### 4.3 Rechenregeln

- Ausgezahlt (ZA n) = Summe betrag aller aktiven Zahlungen mit za_nummer = n.
- Zahlungsdatum fuer Status und Anzeige = juengstes Datum der Zahlungen.
- calcStatus: unveraendert, aber mit der Summe statt dem Einzelbetrag
  (volle_zahlung wenn Summe >= Anforderung, sonst gekuerzte_zahlung).
- VN "bisher erhaltene Zuwendungen" = Summe aller Zahlungen des Projekts fuer die ZA im
  Berichtszeitraum.
- Sammelueberweisung = mehrere Zeilen mit gleichem datum und gleicher referenz. Der
  Ueberweisungsbetrag ist die Summe der Gruppe, er wird nicht separat gespeichert.

### 4.4 Oberflaeche

**ZAPanel, Archiv-Tab (Standard, unveraendert im Aussehen):** Datum, Betrag, Anmerkung
je ZA wie heute. Speichern legt genau eine Zahlung an bzw. aendert sie. Nur wenn eine
ZA mehr als eine Zahlung hat, erscheint darunter eine kleine Liste mit "+ weitere
Zahlung".

**Neu: "Sammelueberweisung erfassen"** (Knopf im Archiv-Tab): Datum, Gesamtbetrag,
Referenz (vorbelegt z. B. "Ueberw. 13.03.26"), dann Aufteilung auf die ZA. Speichern
nur, wenn die Aufteilung exakt dem Gesamtbetrag entspricht.

**Cockpit, ZA-Tabelle:** Spalte "Betrag" zeigt die Summe; bei mehreren Zahlungen
"8.275,00 (2)" mit Tooltip der Einzelzahlungen. Anteile einer Sammelueberweisung werden
im Tooltip als solche benannt ("Teil von 12.128,00, Ueberw. 13.03.26"). Die Differenz je
ZA ist dann wieder aussagekraeftig.

### 4.5 Migration

```sql
INSERT INTO v7_za_zahlungen (project_id, za_nummer, datum, betrag, kommentar)
SELECT project_id, za_nummer, zahlungseingang_datum, zahlungseingang_betrag,
       zahlungseingang_kommentar
FROM v7_zahlungsanforderungen
WHERE zahlungseingang_betrag IS NOT NULL AND zahlungseingang_betrag > 0;
```

In DEV und PROD (Paritaet). Die drei alten Spalten bleiben zunaechst bestehen und
werden nicht mehr beschrieben; Entfernen erst in einer spaeteren Etappe, wenn alle
Leser umgestellt und verifiziert sind.

Nach der Migration bei Freund: die Zahlung vom 13.03.26 (heute komplett bei ZA 2,
12.128) ueber die Oberflaeche aufteilen in ZA 1: 6.700 und ZA 2: 5.428, gleiche
Referenz "Ueberw. 13.03.26". Siehe 6.1.

### 4.6 Betroffene Leser

| Datei | Heute | Neu |
|---|---|---|
| ZAPanel | zahlungseingang_* lesen/schreiben, calcStatus | v7_za_zahlungen, Summe |
| FirmaCockpit | Spalten Zahlung/Betrag/Differenz, Karte "Ausgezahlt" | Summe je ZA-Nummer |
| verwendungsnachweis-utils | bisherErhalten aus zahlungseingang_betrag | Summe aus v7_za_zahlungen |
| VerwendungsnachweisPanel | laedt ZA inkl. zahlungseingang_betrag | laedt zusaetzlich Zahlungen |

Nicht betroffen: mein-status, ProjectDetailPage, NWMEigenanteilPanel (lesen keine
Zahlungseingaenge). Vor Umsetzung per Suche ueber src/ bestaetigen, dass es keine
weiteren Leser gibt (z. B. API-Routen ausserhalb von downloads/).

---

## 5. Teil A - Korrektur einer eingereichten ZA (Etappe 3)

### 5.1 Datenmodell

Zwei neue Spalten in `v7_zahlungsanforderungen`:

| Spalte | Typ | Bedeutung |
|---|---|---|
| korrektur_nr | int not null default 0 | 0 = Original, 1 = erste Korrektur ... |
| ersetzt_durch_id | uuid null FK auf dieselbe Tabelle | gesetzt, sobald eine Korrektur eingereicht ist |

Neuer Status `ersetzt`.

**Unique-Regel (geprueft 21.09.2026, DEV und PROD identisch):** Es besteht
`v7_za_projekt_nummer UNIQUE (project_id, za_nummer)`. Eine Korrektur mit derselben
Nummer wuerde heute von der Datenbank abgelehnt. Die Regel wird in Etappe 3 ersetzt:

```sql
-- Skizze, finales Skript in Etappe 3 (DEV zuerst, dann PROD)
ALTER TABLE v7_zahlungsanforderungen
  ADD COLUMN korrektur_nr int NOT NULL DEFAULT 0,
  ADD COLUMN ersetzt_durch_id uuid NULL REFERENCES v7_zahlungsanforderungen(id);
ALTER TABLE v7_zahlungsanforderungen DROP CONSTRAINT v7_za_projekt_nummer;
ALTER TABLE v7_zahlungsanforderungen
  ADD CONSTRAINT v7_za_projekt_nummer_korr UNIQUE (project_id, za_nummer, korrektur_nr);
```

Bestehende ZA erhalten korrektur_nr = 0 und bleiben damit eindeutig. Der Code nutzt
kein upsert/onConflict auf dieser Tabelle (geprueft in ZAPanel, FirmaCockpit,
ProjectDetailPage, mein-status, NWMEigenanteilPanel) - die Aenderung der Regel bricht
keinen Speicherpfad.

### 5.2 Ablauf

1. An einer eingereichten ZA (Status eingereicht, volle_zahlung, gekuerzte_zahlung)
   gibt es den Knopf **"Korrektur erstellen"**.
2. PZE legt eine Kopie an: gleiche za_nummer, gleicher Zeitraum, korrektur_nr + 1,
   eingereicht_am leer (Entwurf). Kosten und Foerderbetrag werden mit dem aktuellen
   Datenstand neu berechnet - genau dafuer wird korrigiert (Fall Freund: Stunden
   Carolin nachgetragen).
3. Solange die Korrektur Entwurf ist, gilt weiter das Original. Deckblatt und Anlagen
   der Korrektur druckt PZE wie bei jeder ZA.
4. Mit dem Setzen von eingereicht_am an der Korrektur erhaelt das Original den Status
   `ersetzt` und ersetzt_durch_id. Ab dann zaehlt nur die Korrektur.
5. Loeschen einer Korrektur (nur im Entwurf) ist folgenlos. Loeschen einer eingereichten
   Korrektur stellt das Original wieder her (Status neu aus calcStatus).

Der Abrechnungszeitraum ist in der Korrektur NICHT aenderbar. Wer den Zeitraum aendern
will, braucht eine neue ZA, keine Korrektur.

### 5.3 "Gueltige Version"

Je ZA-Nummer gilt die Zeile, die nicht `ersetzt` ist. Ein Entwurf einer Korrektur
zaehlt nicht mit, solange das Original gueltig ist.

| Stelle | Regel |
|---|---|
| Summen (Cockpit "Angefordert", VN "angefordert laut ZA") | nur gueltige Version, keine Korrektur-Entwuerfe |
| Kosten im VN (Abschnitt A) | pro ZA-Nummer nur einmal - sonst doppelte Kosten |
| Naechste ZA-Nummer (ZAPanel) | max(za_nummer) + 1, Korrekturen zaehlen nicht mit |
| mein-status "letzte ZA" | filtert bereits auf eingereicht/bewilligt, ersetzt faellt automatisch heraus |
| NWMEigenanteilPanel | muss `ersetzt` ausfiltern (sonst doppelte NWM-Kosten) |
| ProjectDetailPage | eingefroren (ZA-10); zeigt ersetzte Zeilen mit Status "ersetzt" - hingenommen |

calcStatus darf den Status `ersetzt` beim erneuten Speichern nicht ueberschreiben.

### 5.4 Anzeige

- ZA-Nummer mit Kennung: "1", "1 K1", "1 K2".
- Ersetzte Zeile grau, Betrag durchgestrichen, Tooltip "ersetzt durch 1 K1 am 23.02.26".
- Cockpit-Pruefung der Abrechnungszeitraeume beruecksichtigt nur gueltige Versionen
  (sonst meldet sie Ueberlappung zwischen Original und Korrektur).

---

## 6. Ergebnis fuer Steuerkanzlei Freund (Testfall)

| ZA | eingereicht | Anforderung | Zahlungen | Differenz |
|---|---|---|---|---|
| ~~1~~ (ersetzt) | 02.02.26 | ~~1.575~~ | - | - |
| 1 K1 | 23.02.26 | 8.275 | 1.575 (27.02.) + 6.700 (Ueberw. 13.03.) | 0 |
| 2 | 03.03.26 | 5.428 | 5.428 (Ueberw. 13.03.) | 0 |
| 3 | 07.05.26 | 15.391 | 15.391 | 0 |
| 4 | 07.07.26 | 14.784 | 14.784 | 0 |
| 5 | 09.09.26 | 14.593 | - | 14.593 |

Angefordert 58.471 | ausgezahlt 43.878 | offen 14.593. VN unveraendert (Summe A
83.529,51, bisher erhalten 43.878,00).

### 6.1 Vorgehen Freund in PROD (Entscheidung Martin 21.09.2026)

Freund ist der erste echte Anwendungsfall. **Nichts wird geloescht oder neu aufgebaut.**

Begruendung: neu angelegte ZA werden aus den HEUTIGEN Stunden berechnet, die
eingereichten Betraege beruhen auf dem Stand zum Einreichungszeitpunkt. Die Original-
ZA 1 (1.575) ist nicht mehr reproduzierbar - mit Carolins inzwischen erfassten Stunden
ergaebe eine neue ZA 1 sofort 8.275. Ein Neuaufbau wuerde die beim Projekttraeger
liegenden Betraege ueberschreiben statt nachbilden.

| Zeitpunkt | Schritt |
|---|---|
| nach Etappe 2 | Zahlung 13.03.26 (12.128) ueber die Oberflaeche aufteilen: ZA 1 6.700, ZA 2 5.428, Referenz "Ueberw. 13.03.26" |
| nach Etappe 3 | einmaliges SQL: bestehende ZA 1 (8.275) erhaelt korrektur_nr = 1; neue Zeile ZA 1 korrektur_nr = 0 mit festem Betrag 1.575, eingereicht_am 02.02.2026, Status `ersetzt`, ersetzt_durch_id = ZA 1 K1. Keine Neuberechnung |
| danach | Kommentare aus der Sofortloesung (Abschnitt 7) loeschen |

Hinweis zum Ablauf "Korrektur erstellen": er geht vom Original zur Korrektur. Bei Freund
existiert in PZE nur die Korrektur, deshalb der einmalige Nachtrag per SQL statt ueber
die Oberflaeche.

## 7. Sofortloesung bis zur Umsetzung

Kommentarfeld im Archiv-Tab (Vorschlag):
- ZA 1: "Korrektur-ZA vom 23.02.26 (8.275) ersetzt Original vom 02.02.26 (1.575).
  Gezahlt: 1.575 am 27.02.26 + 6.700 aus Sammelueberweisung 12.128 vom 13.03.26
  (siehe ZA 2)."
- ZA 2: "Sammelueberweisung 12.128 vom 13.03.26 = 6.700 Rest Korrektur-ZA 1 + 5.428
  ZA 2."

Die Kommentare sind nur eine Bruecke. Sobald Freund nach Etappe 3 sauber abgebildet
ist, werden sie geloescht - sonst stehen dieselben Informationen doppelt und koennen
sich spaeter widersprechen.

## 8. Umsetzungsetappen

| Etappe | Inhalt | SQL | Test |
|---|---|---|---|
| 1 | Tabelle v7_za_zahlungen + Migration | ja, DEV und PROD | Summe je ZA = bisheriger zahlungseingang_betrag, fuer alle Projekte |
| 2 | Zahlungen lesen/schreiben: ZAPanel, Cockpit, VN; Sammelueberweisung | nein | Freund: Aufteilung 6.700 / 5.428, Differenzen 0; andere Projekte unveraendert |
| 3 | Korrektur-Versionierung | ja, DEV und PROD | Korrektur anlegen, einreichen, loeschen; Summen, VN, Cockpit-Pruefung, NWM |

Jede Etappe einzeln: GO -> SQL/Code -> Build -> Test in DEV nach Drehbuch
(Abschnitt 11) -> Deploy -> Pruefung in PROD -> Freund-Schritt (6.1).

**Warum B (Etappe 1-2) vor A (Etappe 3):**
- B loest das sichtbare Problem: die Scheindifferenzen entstehen, weil eine ZA nur ein
  Zahlungsfeld hat.
- A baut auf B auf: dass bisherige Zahlungen automatisch zur Korrektur gehoeren (4.2),
  setzt die Zahlungsliste voraus. A zuerst liesse Freund weiterhin nicht abbilden.
- B ist das geringere Risiko: neue Tabelle, die ZA-Tabelle bleibt unberuehrt. A aendert
  die ZA-Tabelle selbst, von der sechs Stellen im Code abhaengen.

## 9. Verhaltensvertrag (Vorschau)

Betroffen: ZA-04 (Zahlungseingang), ZA-05/ZA-06 (Foerderbetrag, historische Werte),
FC-04 (ZA-Tabelle), VN-04 (Schlusszahlung). Neue Regeln voraussichtlich:
- Zahlungen gehoeren zur ZA-Nummer, nicht zur Version.
- Summen zaehlen je ZA-Nummer genau eine gueltige Version.
- calcStatus ueberschreibt `ersetzt` nie.

## 10. Entscheidungen (Martin, 21.09.2026)

| Nr | Frage | Entscheidung |
|---|---|---|
| 1 | Zahlung an der ZA-Nummer statt an der Version (4.2) | ja |
| 2 | Zeitraum in einer Korrektur fest (5.2) | ja |
| 3 | Reihenfolge B vor A | ja (Begruendung Abschnitt 8) |
| 4 | Datum Sammelueberweisung Freund | 13.03.2026 laut Kontoauszug |
| 5 | Freund | erster echter Anwendungsfall; kein Loeschen/Neuaufbau in PROD; kompletter Ablauf wird in DEV an einem erfundenen Fall getestet (6.1, 11) |
| 6 | Unique-Regel | vorhanden in DEV und PROD, wird in Etappe 3 erweitert (5.1) |

---

## 11. DEV-Testdrehbuch

Umgebung: DEV (`projektzeiterfassung20`). Testdaten werden eigens angelegt, damit kein
echter Kunde beruehrt wird.

**Vorbereitung (einmalig):** Testfirma "Testfirma Korrektur GmbH", ein ZIM-DS-Projekt
"TEST-KORR" mit Laufzeit 01.01.-30.06.2026, Foerdersatz 70 %, Zuschlag 30 %, zwei
Mitarbeiter mit Stundensatz, je ein technisches und ein nichttechnisches Arbeitspaket.
Stunden fuer Januar bis April erfassen. Die genauen Klickschritte liefert Claude vor
dem ersten Test einzeln.

**Etappe 1 und 2 - Zahlungen**

| Nr | Test | Erwartung |
|---|---|---|
| T1 | ZA 1 (Jan-Feb) anlegen, einreichen, Zahlung in voller Hoehe erfassen | Eingabe sieht aus wie heute; Status "volle Zahlung"; Cockpit-Differenz 0 |
| T2 | ZA 2 (Maerz) einreichen, zwei Teilzahlungen erfassen | beide Zahlungen sichtbar, Cockpit zeigt Summe mit "(2)", Tooltip listet beide; Status erst bei voller Summe "volle Zahlung" |
| T3 | ZA 3 (April) einreichen; Sammelueberweisung auf ZA 2 und ZA 3 erfassen | Speichern nur, wenn Aufteilung = Gesamtbetrag; beide Teile mit gleicher Referenz; Tooltip nennt die Sammelueberweisung |
| T4 | Sammelueberweisung mit falscher Aufteilung | Speichern gesperrt, klare Meldung |
| T5 | Verwendungsnachweis | "bisher erhaltene Zuwendungen" = Summe aller Zahlungen |
| T6 | Migration (SQL) | Summe je ZA in v7_za_zahlungen = bisheriger zahlungseingang_betrag, fuer alle Projekte |

**Etappe 3 - Korrektur**

| Nr | Test | Erwartung |
|---|---|---|
| T7 | An ZA 1 "Korrektur erstellen" | Entwurf "1 K1"; Original gilt weiter; Summen unveraendert |
| T8 | In der Korrektur den Zeitraum aendern wollen | nicht moeglich |
| T9 | Stunden fuer Januar nachtragen, Korrektur neu berechnen, einreichen | Original grau "ersetzt"; Summen nutzen 1 K1; Zahlungen von ZA 1 erscheinen bei 1 K1 |
| T10 | Cockpit-Pruefung der Zeitraeume | keine Ueberlappung gemeldet |
| T11 | Verwendungsnachweis | Kosten von ZA 1 nur einmal (aus 1 K1) |
| T12 | "+ Neue ZA" | naechste Nummer 4, nicht beeinflusst von 1 K1 |
| T13 | eingereichte Korrektur 1 K1 loeschen | Original wieder gueltig, Status per calcStatus neu |
| T14 | Original erneut speichern, waehrend es ersetzt ist | Status bleibt "ersetzt" |

Erst wenn alle Tests einer Etappe bestanden sind: Deploy nach PROD, dann der
Freund-Schritt aus 6.1.

---

## 12. Stand der Umsetzung (Session 88, 21.09.2026)

### 12.1 Erledigt

| Etappe | Ergebnis |
|---|---|
| 1 | Tabelle v7_za_zahlungen, RLS identisch mit v7_zahlungsanforderungen (per pg_policies.qual verglichen), Migration. DEV 4 = 4, PROD 11 = 11 Zahlungen, 0 Abweichungen. PROD bewusst erst unmittelbar vor dem Deploy |
| 2 | ZAPanel 7.4.4-80, FirmaCockpit 7.4.9-36-21, VerwendungsnachweisPanel 1.2-7, ZASeite 1.0.11. verwendungsnachweis-utils unveraendert (Panel uebergibt die Summe je ZA im bestehenden Feld) |
| Freund (6.1) | Zahlung 12.128 von ZA 2 entfernt, Sammelueberweisung 13.03.2026 "Ueberw. 13.03.26": ZA 1 6.700, ZA 2 5.428. ZA 1 8.275 (2), ZA 2 5.428, Differenzen 0 |

Abweichungen von 4.4 bzw. Ergaenzungen: Archiv ist kein Tab mehr, sondern steht oben
rechts in der ZA-Auswahl; Zahlungen nur bei eingereichten ZA; Loeschen eingereichter
ZA nur mit Eingabe der ZA-Nummer; Betragseingabe versteht "12.128,00".

### 12.2 Zusaetzliche Regel aus dem Test (verbindlich)

Eine Zahlung aendert NIE den angeforderten Betrag. Die alte Regel "beim Sichern im
Archiv immer neu berechnen" (v7.4.4-41) hat in DEV eingereichte Betraege veraendert;
seit ZAPanel -77 wird foerderbetrag_gesamt nur gefuellt, wenn er leer ist.

### 12.3 Pflichtpunkte fuer Etappe 3

1. "ZA speichern" im Deckblatt berechnet eine EINGEREICHTE ZA neu und ueberschreibt
   den Betrag (A-090). Mit der Korrektur-Versionierung: eingereichte ZA nur lesen,
   Aenderung nur ueber "Korrektur erstellen".
2. Freund ZA 1 hat in PZE eingereicht_am 15.04.2026, das Konzept (Abschnitt 1) nennt
   23.02.2026 fuer die Korrektur. Vor dem SQL-Nachtrag (6.1) klaeren.
3. Summen und Loeschlogik je ZA-Nummer muessen mit mehreren Zeilen je Nummer umgehen
   (VN-Panel summiert derzeit je Nummer und haengt die Summe an jede Zeile).
4. VN "angefordert laut ZA" nur gueltige Versionen und keine Entwuerfe (A-089).
5. Brueckenkommentar an der Zahlung ZA 1 vom 27.02.2026 nach Etappe 3 loeschen
   (Abschnitt 7); der Kommentar an ZA 2 ist mit der Aufteilung bereits entfallen.

