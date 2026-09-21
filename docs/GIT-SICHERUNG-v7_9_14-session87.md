# GIT-SICHERUNG - Session 87 (V7.9.14)

**Datum:** 21. September 2026
**SW-Release:** V7.9.14 (Korrekturen zu V7.9.13: ZA-Anforderung ganze Euro,
VN-Berichtszeitraum aus Projektdaten, keine stille ZA-Exklusion) - in PRODUKTION
**Pflichtenheft:** v5.48
**Verhaltensvertrag:** v1.6
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_13-session86.md

**Stand main / v7-dev / Tag:** siehe git log. Release-Tag `v7.9.14` wird mit dem
Doku-Commit gesetzt und auf origin und cubintec gepusht.

**Deploy-Stand:** In PROD deployt (zwei Merges, je origin + cubintec). **KEIN SQL-Schema.**
Datenaenderungen durch Martin (Oberflaeche): Projektende ANOVIA 30.08. -> 31.08.2026;
neue ZA 4 (Mai/Juni) angelegt, bisherige ZA 4 -> ZA 5; ZA-Betraege neu gespeichert;
Projektstunden 31.08.2026 aus gesichertem PDF wiederhergestellt; VN neu gespeichert.

---

## Ausloeser

1. Martin: das Originalformular der ZA rundet die Anforderung auf ganze Euro (z. B.
   5.428,22 -> 5.428). Die Centrundung aus Session 86 (A-075) war falsch.
2. Martin: Cockpit zeigt 5 ZA mit 58.471 EUR angefordert, der VN nur 4 ZA.
3. Martin: das Projektende ist der 31.08.2026, nicht der 30.08.

## Weg zur Loesung

1. **Rundung:** Rueckfrage Richtung -> kaufmaennisch (ZA 1: 8.274,63 -> 8.275). VN
   bleibt centgenau (Martin). ZAPanel -72 + Lib -6 mit roundEuro(); Toleranz der
   VN-Warnung auf Anzahl ZA x 0,50 + 0,005 EUR (sonst Dauerwarnung).
2. **ZA 5 fehlte im VN:** der VN nahm den Berichtszeitraum aus dem gespeicherten
   Datensatz (bis 30.08.), nicht aus dem Projekt; zaImZeitraum verlangte vollstaendige
   Enthaltenheit -> ZA 5 (bis 31.08.) fiel komplett heraus, Fehlalarm "Rueckforderung".
   Lib -7: Ueberschneidung genuegt, Kappung, Warnung. Panel -6: Berichtszeitraum fest
   aus Projektdaten (Vorgabe Martin), Hinweis bei abweichendem Speicherstand.
3. **Projektende 31.08.:** die in Session 86 geloeschten 31.08.-Projektstunden waren
   zulaessig. Martin hat sie aus dem PDF wiederhergestellt; SQL-Pruefung: Jul/Aug
   586,00 h T / 27,00 h NT (Stand vor dem 19.09., inkl. Robins 1 h AP3), "sonstige"
   am 31.08. = 0. Kosten Jul/Aug 20.847,34 x 0,70 = 14.593,13 -> exakt ZA 5.

## PROD-Pruefung VN ANOVIA (21.09.2026)

5 ZA | Summe A 83.529,51 | erhalten 43.878,00 | Schlusszahlung 14.592,66 |
Zuwendung 58.470,66 | Eigenanteil 25.058,85 | Summe 83.529,51 |
C: 1.739,00 / 730,33 / 2.469,33 h | keine Warnung. Angefordert laut ZA 58.471 EUR.

## Code-Integration (Status) - V7.9.14

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| ZAPanel-v7_4_4-72.tsx | src/components/shared/ZAPanel.tsx | DEPLOYED (V7.9.14) |
| verwendungsnachweis-utils-v1_2-6.ts | src/lib/verwendungsnachweis-utils.ts | deployed, aufgegangen in -7 |
| verwendungsnachweis-utils-v1_2-7.ts | dto. | DEPLOYED (V7.9.14) |
| VerwendungsnachweisPanel-v1_2-6.tsx | src/components/shared/VerwendungsnachweisPanel.tsx | DEPLOYED (V7.9.14) |

Je Build: ASCII-Check (0 Nicht-ASCII), `npm run build` lokal fehlerfrei (Martin).

## Korrektur zu Session 86

Die ANOVIA-Darstellung in GIT-SICHERUNG-v7_9_13-session86.md und PFLICHTENHEFT v5.47
("31.08. ausserhalb der Bewilligung, 390,42 EUR zu viel angefordert", Loeschung der
31.08.-Stunden) beruhte auf dem falsch erfassten Projektende. Die Code-Aenderungen der
Session 86 (taggenaue Abrechnung, Sperre fuer Projektstunden nach Bewilligungsende,
VN Abschnitt B/C, Cockpit-Pruefung) bleiben richtig; ausgenommen die Centrundung der
ZA-Anforderung (A-075), die hier zurueckgenommen wurde.

## Lehren dieser Session

- Stammdaten zuerst pruefen: ein falsches Projektende hat eine ganze Kette plausibler,
  aber falscher Schlussfolgerungen erzeugt.
- Gespeicherte Werte duerfen Stammdaten-Aenderungen nicht verdecken (VN-Berichtszeitraum).
- Formularvorgaben schlagen Spaltenkoepfe: "[EUR, Cent]" galt fuer die Kosten, nicht fuer
  die Anforderung.

## Offen / naechste Schritte

- **A-080 55 latente Typfehler:** eigene Session.
- Moegliche Folgeanforderung: eingereichte ZA gegen nachtraegliche Stundenaenderungen
  sperren oder warnen.
- Moegliche Folgeanforderung: Cockpit-Pruefung meldet auch ZA, die ueber das Projektende
  hinausragen.
- Optional: Spalte "Kommentar" in der Cockpit-ZA-Tabelle entfernen.
- Aus Session 85 uebernommen: Androlite/WISE Herrler (Klaerung Kunde), A-066, A-070,
  A-071, Stammdaten annual_leave_days, FZul-Export Ausbau, A-013 u. a.

## Doku dieser Session

PFLICHTENHEFT-v5_48-AENDERUNGSBLOCK.md; VERHALTENSVERTRAG-v1_6.md;
GIT-SICHERUNG-v7_9_14-session87.md (diese Datei); PZE-Upload-Checkliste-Session87.xlsx;
aufraeumen-session87-v1.zsh (umfasst auch den noch nicht ausgefuehrten Aufraeumstand
von Session 86).
