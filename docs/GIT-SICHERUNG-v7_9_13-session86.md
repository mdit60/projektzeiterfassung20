# GIT-SICHERUNG - Session 86 (V7.9.13)

**Datum:** 19.-21. September 2026
**SW-Release:** V7.9.13 (Verwendungsnachweis mit Eigenanteil und Personenstunden,
taggenaue Abrechnung, Sperre fuer Projektstunden nach Bewilligungsende, ZA-Zeitraum im
Cockpit) - in PRODUKTION
**Pflichtenheft:** v5.47
**Verhaltensvertrag:** v1.5
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_12-session85.md

**Stand main / v7-dev / Tag:** siehe Ausgabe des Sicherungsbefehls (git log). Release-Tag
`v7.9.13` wird mit dem Doku-Commit gesetzt und auf origin und cubintec gepusht.

**Deploy-Stand:** In PROD deployt (mehrere Merges, je origin + cubintec). **KEIN SQL-
Schema.** In PROD nur lesende Abfragen. Einzige Datenaenderung: Martin hat die vier
ANOVIA-Projektbuchungen vom 31.08.2026 (Carolin 6 h AP2, Marlene 4 h AP3, Robin 2 h AP2,
Robin 5 h AP6) im Zeiterfassungsformular geleert; die Auto-Vorbelegung hat den Tag mit
nicht foerderbaren Stunden aufgefuellt (8,0 / 6,0 / 2,4 h) - bewusst so belassen.

---

## Ausloeser

Martin, ANOVIA (Steuerkanzlei Robin Freund, 16KN124596, ZIM DS, 01.11.2025-30.08.2026):
(1) Im Verwendungsnachweis fehlt unter B der Eigenanteil. (2) Fuer die DS-Schlussab-
rechnung werden die Gesamtstunden technisch/nichttechnisch je MA benoetigt.
Beim Pruefen: Kosten x 30 % und Kosten - Zuwendung ergaben verschiedene Werte (Einwand
Martin: das muss identisch sein, sonst stimmt etwas in den Zahlen nicht - korrekt).

## Weg zur Loesung

1. **Befund Abschnitt B:** Zuwendung = Summe der je ZA eingefrorenen foerderbetrag_gesamt,
   Kosten dagegen live neu gerechnet. Abgleich je ZA per SQL in PROD: ZA 1/2 exakt, ZA 3
   -0,02 (Euro-Rundung), ZA 4 +26,12.
2. **ZA 4 +26,12 aufgeklaert:** am 19.09.2026 07:40 UTC wurde Juli/August im Zeit-
   erfassungsformular gespeichert (rund 80 Zeilen neues updated_at in 31 s); dabei die
   1 h AP3 von Robin am 31.08. deaktiviert. 1 h x 28,85 x 1,30 x 0,70 -> exakt der
   gespeicherte Betrag. Stundensaetze unveraendert (letzte Aenderung 07.05.2026).
3. **Eigentliche Ursache Monatslogik:** Bescheid endet 30.08. (Sonntag), der 31.08. ist
   nicht zuwendungsfaehig. ZA und VN filterten aber ganze Kalendermonate -> 31.08. mit 12 h
   T + 5 h NT abgerechnet, 390,42 EUR zu viel. Fix: taggenaues Abrechnungsfenster, eine
   Quelle in der Lib, ZAPanel importiert (A-074). PROD: ZA 4 573/22 h, 20.252,09 EUR.
4. **Euro-Rundung:** Foerderbetrag nun centgenau, kaufmaennisch (A-075). PROD: 14.176,46.
5. **Sperre Zeiterfassung:** erster Entwurf -99 sperrte den ganzen Tag -> verworfen nach
   Einwand Martin (nicht foerderbare Stunden ausserhalb der Bewilligung sind korrekt).
   -100 sperrt nur AP-Zeilen (A-076). Reihenfolge-Lehre: Leeren von Projektstunden loest
   die Auto-Vorbelegung aus.
6. **VN Abschnitt B/C:** Zuwendung aus A, Eigenanteil als Residuum, Kontrollsumme,
   Abschnitt C Personenstunden (A-077/A-078). Fussnote C zeigte \u-Escapes woertlich
   (JSX-Text) -> v1.2-4. Restdifferenz 0,01 EUR strukturell (Summe gerundeter Werte) ->
   Toleranz (n+1) x 0,005 (v1.2-5).
7. **Cockpit:** ZA-Zeitraum und Vollstaendigkeitspruefung (A-079). Meldet bei ANOVIA die
   Luecke 01.05.-30.06.2026.

## PROD-Abfragen (nur lesend) und Befunde

- `v7_projects.end_date` ANOVIA = 2026-08-30 (korrekt).
- VN-Migration in PROD vorhanden (v7_verwendungsnachweise, v7_projects.beihilfe_basis) -
  PZE-UMGEBUNGEN-DEV-PROD.md wies sie noch als offen aus, aktualisiert.
- Nach der Bereinigung: ZA-4-Fenster unveraendert 573,00 / 22,00 h, 98 Buchungen; am
  31.08. nur noch drei nicht foerderbare Zeilen.
- VN ANOVIA: Summe A 61.814,77 | Zuwendung 43.270,34 | Eigenanteil 18.544,43 |
  Summe 61.814,77 | C: 1.353,00 / 473,33 / 1.826,33 h. ZA 3 und 4 von Martin neu
  gespeichert (15.391,02 / 14.176,46).

## Code-Integration (Status) - V7.9.13

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| verwendungsnachweis-utils-v1_2-2.ts | src/lib/verwendungsnachweis-utils.ts | deployed, aufgegangen in -3 |
| verwendungsnachweis-utils-v1_2-3.ts | dto. | deployed, aufgegangen in -4 |
| verwendungsnachweis-utils-v1_2-4.ts | dto. | deployed, aufgegangen in -5 |
| verwendungsnachweis-utils-v1_2-5.ts | dto. | DEPLOYED (V7.9.13) |
| ZAPanel-v7_4_4-70.tsx | src/components/shared/ZAPanel.tsx | deployed, aufgegangen in -71 |
| ZAPanel-v7_4_4-71.tsx | dto. | DEPLOYED (V7.9.13) |
| TimesheetForm-v7_4_6-99.tsx | - | VERWORFEN, nie integriert |
| TimesheetForm-v7_4_6-100.tsx | src/components/shared/TimesheetForm.tsx | DEPLOYED (V7.9.13) |
| VerwendungsnachweisPanel-v1_2-3.tsx | src/components/shared/VerwendungsnachweisPanel.tsx | deployed, aufgegangen in -4 |
| VerwendungsnachweisPanel-v1_2-4.tsx | dto. | deployed, aufgegangen in -5 |
| VerwendungsnachweisPanel-v1_2-5.tsx | dto. | DEPLOYED (V7.9.13) |
| FirmaCockpit-v7_4_9-36-16.tsx | src/components/shared/FirmaCockpit.tsx | DEPLOYED (V7.9.13) |

Je Build: ASCII-Check (0 Nicht-ASCII), `npm run build` lokal fehlerfrei (Martin).
`tsconfig.json` zwischenzeitlich um exclude erweitert und wieder zurueckgesetzt -
unveraendert.

## Lehren dieser Session

- Lokaler Test NUR `npm run build`. Ein vorgeschalteter `npx tsc --noEmit` brach an 55
  Altfehlern und an Ablageordnern ab (DEPLOY-PROZESS-PZE.md ergaenzt, IF-14).
- Deployment ist nicht Migration (PZE-UMGEBUNGEN-DEV-PROD.md ergaenzt, mit Schnelltest).
- \u-Escapes nur in JS-Strings; JSX-Text braucht HTML-Entities.

## Offen / naechste Schritte

- **A-081 ANOVIA Luecke Mai/Juni 2026:** Klaerung durch Martin mit den Zahlungseingaengen.
  Das Cockpit meldet die Luecke jetzt selbst.
- **A-080 55 latente Typfehler:** eigene Session.
- Moegliche Folgeanforderung: eingereichte ZA gegen nachtraegliche Stundenaenderungen
  sperren oder warnen (siehe Pflichtenheft v5.47 Paragraph 5).
- Optional: Spalte "Kommentar" in der Cockpit-ZA-Tabelle (durchgehend leer) entfernen.
- Aus Session 85 uebernommen: Androlite/WISE Herrler (Klaerung Kunde), A-066, A-070,
  A-071, Stammdaten annual_leave_days, FZul-Export Ausbau, A-013 u. a.

## Doku dieser Session

PFLICHTENHEFT-v5_47-AENDERUNGSBLOCK.md; VERHALTENSVERTRAG-v1_5.md;
GIT-SICHERUNG-v7_9_13-session86.md (diese Datei); DEPLOY-PROZESS-PZE-v2.md;
PZE-UMGEBUNGEN-DEV-PROD-v2.md; PZE-Upload-Checkliste-Session86.xlsx;
aufraeumen-session86-v1.zsh.
