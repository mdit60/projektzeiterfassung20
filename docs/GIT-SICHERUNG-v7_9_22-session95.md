# GIT-SICHERUNG - Session 95 (V7.9.22)

**Datum:** 3. November 2026
**SW-Release:** V7.9.22 (Austritt von Netzwerkpartnern) - in PRODUKTION
**Pflichtenheft:** v5.56
**Verhaltensvertrag:** v1.14
**Deploy-Prozess:** v3 (unveraendert)
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_21-session94.md

**Deploy-Stand:** zwei Deploys am 03.11.2026.
- Commit 277b2da auf v7-dev, Merge 2ffa1d5 in main.
- Commit 0f90ff2 auf v7-dev, Merge 8b955cf in main.
- Push jeweils auf origin und cubintec. Ergebnis von Martin per Screenshot aus PROD belegt.

**Kein SQL-Schema.** Eine Datenkorrektur in PROD (siehe unten).

---

## Ausloeser

Martin: Bei der Netzwerkabrechnung fehle die Moeglichkeit, dass ein Netzwerkpartner
ausscheidet. Fall VoltaMove GmbH, YachtConnect (16KN124502).

## Befund

Der Austritt war eintragbar (NWMPartnerPanel, Symbol Personen-Minus), die Abrechnung
beachtete das Datum aber nicht:
- Der Filter austritt_datum IS NULL entfernte den NP aus allen Zeitraeumen, auch frueheren.
- Bei Neuberechnung blieb der alte Betrag des NP stehen, die Summe waere zu hoch geworden.
- Name und Rechnungs-PDF frueherer Zeitraeume gingen verloren.
- Ein kuenftiges Datum wirkte sofort, eine Ruecknahme gab es nicht.
- Quoten wurden gleichmaessig statt proportional (Konzept 4.5) verteilt.

## Entscheidung Martin

Regel B: Der NP zahlt nur Zeitraeume, die bis zum Austritt vollstaendig abgelaufen sind.
Austritt VoltaMove: von Martin zunaechst mit 01.08.2026 genannt, eingetragen 31.07.2026
(Ende Netzwerkjahr 1). Fuer die Abrechnung ist beides gleichwertig.

## Umsetzung

- A-112: Teilnahme je Zeitraum, sofortige Neuverteilung, Ruecknahme, kuenftiges Datum,
  stornierte EA ausgeblendet, Quote je Zeitraum mit Summe 100,00 (Paragraph 7.6, NP-01..08).
- A-113: Feste Reihenfolge in Abrechnungsliste und PT-Nachweis.
- A-114: Fix Gleichverteilen (Zaehler im State-Updater, Summe NaN im Entwicklungsmodus).
- Annahme Claude, von Martin nicht entschieden: Beitritt zaehlt ab dem Zeitraum, an dessen
  Ende der NP beigetreten ist. Bei YachtConnect ohne Wirkung (alle 01.08.2025).

## Code-Integration (Status) - V7.9.22

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| NWMEigenanteilPanel-v7_4_5-18.tsx | src/components/shared/NWMEigenanteilPanel.tsx | DEPLOYED |
| NWMPartnerPanel-v7_4_5-7.tsx | src/components/shared/NWMPartnerPanel.tsx | DEPLOYED |
| berater-netzwerk-page-v7_4_5-4.tsx | src/app/v7/berater/netzwerk/page.tsx | DEPLOYED |

ASCII-Check (0 Nicht-ASCII-Zeichen), Rechenlogik per Skript nachgerechnet (Claude);
`npm run build` und Sichtpruefung auf DEV (Martin).

## Daten PROD

Diagnose vor dem Austritt: 6 Zeitraeume, nur 01.08.-31.10.2025 mit Zahlungen (6 von 8),
kein bezahlter Zeitraum nach dem Austritt. Status storniert ist laut CHECK zulaessig.

Austritt VoltaMove zum 31.07.2026 von Martin eingetragen. Zeitraum 01.08.-31.10.2026:
Kosten 63.817,26 EUR, Foerdersatz 50 %, Eigenanteil 31.908,63 EUR, sechsmal 4.558,37 EUR,
BHT 4.558,41 EUR, USt 12.125,28 EUR, offen 44.033,91 EUR. Zeitraeume bis 31.07.2026 mit
VoltaMove unveraendert.

Datenkorrektur nach dem zweiten Deploy: eigenanteil_quote der Zeile BHT GmbH im Zeitraum
01.08.-31.10.2026 auf 14,26 gesetzt (vorher 14,29). Screenshot: Rechnung 260082, 14,26 %.

Rechnungen dieses Zeitraums hat Katrin manuell ausserhalb von PZE angepasst. Ein Cent-Abgleich
gegen diese Rechnungen wurde von Claude nicht vorgenommen.

## Test

Martin auf DEV: Austritt, Zeitraeume vor und nach dem Austritt, Gleichverteilen, Ruecknahme,
erneuter Austritt, Betraege mit Auftraegen Dritter 1.000 EUR, Reihenfolge, PT-Nachweis
("passt jetzt alles"). PROD per Screenshot. Nicht geprueft: Zeitraum mit bezahlten EA
im Browser (nur Simulation), kuenftiges Austrittsdatum.

## Besonderheiten dieser Session

- Fehler Claude: Bei Kosten 0 wurde die Stammdaten-Quote gespeichert (Fund Martin, 14,29 statt
  12,50). Testlauf hatte nur Kosten groesser 0 enthalten.
- Fehler Claude: Quote aus gerundeten Betraegen zurueckgerechnet, 7 x 14,29 = 100,03 %
  (Fund Martin in PROD). Datenkorrektur noetig.
- Fehler Claude: Zuerst blieben stornierte Zeilen sichtbar und die Neuverteilung erforderte
  einen Klick (Fund Martin).
- Prozessabweichung Claude: begrenzter tsc-Lauf in der eigenen Arbeitsumgebung trotz Regel
  im Deploy-Prozess. Abnahme nur ueber `npm run build`.

## Lehren dieser Session

- Eine vorhandene Funktion ist nicht fertig, solange die abhaengige Abrechnung sie nicht beachtet.
- Tests muessen auch den Nullfall enthalten.
- Der Bestand muss sich nach einer Stammdatenaenderung sofort richtig zeigen, nicht erst nach einem Klick.

## Offen / naechste Schritte

- A-115 EA-Verteilung ignoriert die Stammdaten-Quote (fachlich entscheiden).
- A-116 docs/PZE Production Keys.docx in Git versioniert: Historie und Remotes pruefen,
  Schluessel ggf. erneuern. Inhalt von Claude nicht geprueft.
- A-117 "Eigenanteile berechnen" setzt gemahnt auf offen zurueck.
- YachtConnect fachlich: VoltaMove bleibt fuer die Zeitraeume bis 31.07.2026 zahlungspflichtig
  (laut Diagnose gemahnt bzw. offen).
- Weiter offen wie in Session 94: A-111, A-106, A-107, A-108, A-109, A-080, A-098, A-100,
  A-091, Etappe 3 / A-090, A-088, A-089.

## Doku dieser Session

PFLICHTENHEFT-v5_56.md; VERHALTENSVERTRAG-v1_14.md; GIT-SICHERUNG-v7_9_22-session95.md
(diese Datei); PZE-Upload-Checkliste-Session95.xlsx; aufraeumen-session95-v1.zsh.
