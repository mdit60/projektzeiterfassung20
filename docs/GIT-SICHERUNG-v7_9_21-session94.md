# GIT-SICHERUNG - Session 94 (V7.9.21)

**Datum:** 2. November 2026
**SW-Release:** V7.9.21 (Bewilligung im Firma-Cockpit) - in PRODUKTION
**Pflichtenheft:** v5.55
**Verhaltensvertrag:** v1.13
**Deploy-Prozess:** v3 (unveraendert)
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_20-session93.md

**Deploy-Stand:** ein fachlicher Deploy am 02.11.2026, Commit 35577ff auf v7-dev, Merge
6ac1d80 in main, Push auf origin und cubintec. Erfolg von Martin per Screenshot aus PROD
belegt. **Kein SQL-Schema, keine Datenkorrektur.**

---

## Ausloeser

Martin: Im Cockpit von GMM zeigt das Projekt AURA (16KN124599, ZIM DS) die Kosten-Kachel
mit 102 %, obwohl von der Bewilligung noch ueber 4.000 EUR offen sind.

## Befund

Kein Rechenfehler. Die beiden Werte haben verschiedene Bezugsgroessen.

| Groesse | Kosten | Zuwendung (70 %) |
|---|---|---|
| Bewilligung (Bescheid 08.07.2026) | 102.715 EUR | 71.901 EUR |
| Arbeitsplan in PZE | 94.128,49 EUR | 65.889,94 EUR |
| Ist lt. VN | 95.905,60 EUR | 67.133,92 EUR |

- Kachel: 95.905,60 / 94.128,49 = 102 %. VN: 67.133,92 / 71.901 = 93,4 %.
- Verbleibend 4.767,08 EUR. Angefordert 67.134 EUR, also keine Luecke zwischen Anspruch
  und ZA.
- Die 102 % bei 99,6 % PM entstehen aus der Verteilung: Duehrkop +0,88 PM, Nguyen +1,23,
  Oezalp +0,07, Fells -2,24 (Plan-/Ist-Abfrage PROD, Ist centgenau wie VN).
- Arbeitsplan (Datei gespeichert 22.03.2026) und Antrag Anlage 5 stimmen je MA exakt mit
  PZE ueberein: 1,5 / 6,5 / 4,5 / 4,5 = 17,0 PM. Saetze wie Anlagen 6.1 vom 06.11.2025
  (28,85 / 28,85 / 24,23 / 17,31 EUR). Die einzelnen AP wurden nicht mit PZE verglichen.
- Stundensaetze: laut Martin ist ZA 1 geprueft und bezahlt, die Saetze wurden nicht
  beanstandet.
- Antrag gegen Bescheid: Personal technisch 60.006 -> 67.010 EUR (+7.004), Zuschlag
  18.001 -> 20.103 EUR (+2.102), nichttechnisch unveraendert. Gesamt 93.609 -> 102.715 EUR.
  Antrag Anlage 6.2 weicht von Anlage 5 ab (Nguyen 6,0 statt 6,5, Fells 5,0 statt 4,5);
  vom Projekttraeger am 18.03.2026 beanstandet. Das erklaert nur rund 400 EUR.
- ANBest-P-Kosten, nach den Zahlen eingehalten: Nr. 1.2.1 Abweichung je Ansatz bis 20 %
  (groesste +16,3 % nichttechnisch), Nr. 4.2 Ermaessigung bis 7,5 % bzw. 10.000 EUR
  (6,63 %, 6.809,40 EUR).

## Umsetzung (A-110)

FirmaCockpit 7.4.9-36-22, reine Anzeige:
- Kachel "Kosten (Plan)", Berechnung unveraendert. Zweite Zeile "x % der Bewilligung" =
  Ist-Kosten x Foerdersatz / bewilligte Summe. Entfaellt ohne Bewilligung oder Foerdersatz
  und bei ZIM_NETZWERK (Analyse dort je Netzwerkjahr, Foerdersatz faellt je Jahr).
- ZA-Karte: Kachel Bewilligt/Offen ueber den Summen-Karten, fuer das gewaehlte Projekt.
  Offen = bewilligte Summe minus eingereichte Anforderungen, negativ rot.

## Code-Integration (Status) - V7.9.21

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| FirmaCockpit-v7_4_9-36-22.tsx | src/components/shared/FirmaCockpit.tsx | DEPLOYED |

ASCII-Check (0 Nicht-ASCII-Zeichen), Aenderung per Skript mit Eindeutigkeitspruefung jeder
Ersetzung, Syntaxpruefung per Transpile ohne Typecheck (Claude); `npm run build` fehlerfrei
(Martin).

## Test

AURA liegt nur in PROD; nach dem Deploy dort geprueft (Screenshot Martin): Kosten (Plan)
102 %, 96k EUR/94k EUR, 93 % der Bewilligung, Bewilligt 71.901,00 EUR, Offen 4.767,00 EUR,
Angefordert/Ausgezahlt/Differenz unveraendert. Zeile und Kachel passen ins Layout. Nicht
geprueft: Projekt ohne Bewilligung, ZIM_NETZWERK, negativer Offen-Wert (Code-Pfade).
Claude hat die Oberflaeche nur per Screenshot gesehen.

## Besonderheiten dieser Session

- Prozessfehler Claude: `git fetch origin main` im verbundenen Ordner ausgefuehrt, obwohl
  Git bei Martin liegt. Folge: leere .git/objects/maintenance.lock; von Claude nach .git/
  verschoben, von Martin geloescht. Nur die lokale Referenz wurde aktualisiert (IF-21).
- Prozessfehler Claude: Aussage zum Inhalt des Bescheids und eine Rechnung damit, bevor ein
  Lesen des PDF im Verlauf belegt war. Danach gelesen; die Werte stimmten.
- Fehlschluss Claude: aus unveraenderten Saetzen auf zusaetzliche technische PM geschlossen.
  Der Arbeitsplan bestaetigt das nicht. Auch der Code-Befund zur Kachel war zu scharf; ihre
  Skalierung ist laut IF-20 gewollt.
- Fuer die Stand-Pruefung war Zugriff auf ganz pze/ noetig, nicht nur auf downloads/.

## Lehren dieser Session

- Zwei Prozentwerte duerfen nicht ohne Bezugsgroesse nebeneinander stehen.
- Beim Anspruch zaehlt Stunden x Satz x (1 + Zuschlag) x Foerdersatz; der Arbeitsplan geht
  nicht ein. Eine Plan-Abweichung sagt daher nichts ueber die Hoehe von ZA oder VN.
- Kosten aus dem Antrag sind nicht automatisch die des Bescheids; Nachreichungen pruefen.

## Offen / naechste Schritte

- A-111 ProjektFortschrittPanel: Kosten-Anzeige, Planungsluecke, Prognose (niedrig).
- GMM/AURA (fachlich, kein Code): Herkunft der +7.004 EUR im Bescheid ist nicht belegt; dazu
  fehlen die Nachreichungen vom 24.03. und 30.06.2026. Fuer die Hoehe des Anspruchs ohne
  Bedeutung. Die offenen 4.767,08 EUR nur ueber tatsaechlich geleistete, noch nicht erfasste
  Stunden innerhalb der Laufzeit. Frist VN laut Bescheid: 3 Monate nach Ablauf des
  Bewilligungszeitraums (31.12.2026). Zwei Projekte heissen AURA: 16KN124599 GMM,
  16KN12459A OpenZ.
- Aus Session 93 unveraendert: A-106, A-107, A-108, A-109, A-080, A-098, A-100, A-091,
  Etappe 3 / A-090, A-088, A-089.

## Doku dieser Session

PFLICHTENHEFT-v5_55.md; VERHALTENSVERTRAG-v1_13.md; GIT-SICHERUNG-v7_9_21-session94.md
(diese Datei); PZE-Upload-Checkliste-Session94.xlsx; aufraeumen-session94-v1.zsh.
