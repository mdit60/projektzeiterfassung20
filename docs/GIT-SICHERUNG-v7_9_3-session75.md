# GIT-SICHERUNG - Session 75 (V7.9.3)

**Datum:** 7. August 2026
**SW-Release:** V7.9.3 (AP-Status-Druck ueber eigenes Druckfenster - in PRODUKTION)
**Pflichtenheft:** v5.36
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_2-session75.md (dort war der Druck ueber v1.0-7 mit
gemessenem CSS-Zoom beschrieben; dieser Weg wurde robuster ersetzt).

**Deploy-Stand:** In PROD ist der finale Druckweg deployt: ApStatusModal v1.0-10 (Druck
ueber ein eigenes Druckfenster). Merge v7-dev -> main (--no-ff), push origin + cubintec,
Vercel-Prod. Kein SQL, reine Frontend-Aenderung an EINER Datei.

---

## Ziel dieser Etappe

Der in V7.9.2 eingefuehrte AP-Status-Druck funktionierte mit echten PROD-Daten (viele
aufgeklappte Monatszeilen) nicht sauber. Die In-Place-Druckvarianten wurden durch einen
robusten, deterministischen Druckweg ersetzt.

---

## Weg zur Loesung (ApStatusModal v1.0-4 .. v1.0-10; deployt: v1.0-10)

Der Druck wurde iterativ entwickelt; die Zwischenstaende sind im Datei-Header vollstaendig
gefuehrt. Kernprobleme der In-Place-Varianten und die finale Loesung:

- **v1.0-4/-5/-6:** Drucken-Knopf + @media-print; alle mehrmonatigen APs fuer den Druck
  aufgeklappt (printExpandAll, Reset ueber afterprint); Korrektur des rechtsseitigen
  Abschneidens (natuerliche Tabellenbreite statt width:100%).
- **v1.0-7:** Auto-Zoom auf die Seitenbreite (gemessene Breite -> CSS zoom). Deployt, aber:
- **v1.0-8:** position:absolute vertrug sich bei HOHEN Tabellen nicht mit dem Seitenumbruch;
  Umstellung auf normalen Fluss (display:none fuer den Rest via markierte Vorfahren).
- **v1.0-9:** eigener Zoom entfernt, weil er mit Chrome "An Seitenbreite anpassen" kollidierte.
- **PROBLEM (PROD, echte Daten):** Trotz allem entstanden mit vielen Aufklappungen weiterhin
  Artefakte - zuletzt ZWEI identische Seiten (die Tabelle wurde dupliziert statt umgebrochen),
  weil das Modal tief im komplexen App-Layout haengt.
- **v1.0-10 (DEPLOYT, finale Loesung):** Druck ueber ein EIGENES Druckfenster. handlePrint
  klappt alle mehrmonatigen APs auf, kopiert die fertig gerenderte Tabelle (table.outerHTML)
  in ein neues Fenster, das NUR die Tabelle enthaelt, uebernimmt die App-Stylesheets (Tailwind
  -> Rahmen/Farben) samt <base href> fuer verlinkte CSS, und ruft dort window.print(). Im
  isolierten Dokument kann nichts duplizieren; die Tabelle bricht zuverlaessig ueber mehrere
  Seiten um (Kopfzeile je Seite, page-break-inside: avoid), und "An Seitenbreite anpassen"
  skaliert voll aufs A4-Querformat. Das gesamte In-Place-Druck-CSS entfaellt.

Hinweis fuer Nutzer: Beim Drucken oeffnet sich ein separates Fenster/Tab; ggf. muessen Popups
fuer die Seite einmal erlaubt werden. Skalierung im Druckdialog: "An Seitenbreite anpassen".

---

## Code-Integration (Status) - V7.9.3

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| ApStatusModal-v1_0-10.tsx | src/components/shared/ApStatusModal.tsx | DEPLOYED (Druck ueber eigenes Fenster) |

Zwischenstaende v1.0-4..-9 sind im Endstand v1.0-10 aufgegangen. Kein SQL. Deploy: Merge
v7-dev -> main (--no-ff), push origin + cubintec, Vercel.

---

## Verifikation (durch Martin bestaetigt)

- Dev und PROD: Druck oeffnet ein separates Fenster nur mit der Tabelle; echte Folgeseiten
  (keine Duplikate mehr), volle Breite, mehrmonatige APs aufgeklappt, Farben/Rahmen korrekt.
- In PROD deployed und bestaetigt ("das passt jetzt auch in Prod").

---

## Offen / naechste Schritte

- **Idee in Diskussion (noch nicht beauftragt): automatisierte Stundenvorschlaege.** PZE
  erzeugt je MA einen VORSCHLAG (mit menschlicher Bestaetigung, realistische Streuung - kein
  Auto-Nachweis), streng an den geplanten AP-Stunden pro MA/Monat, in AP-Reihenfolge, unter
  Beachtung von WAZ, Fehlzeiten/Feiertagen und den bestehenden Regeln (Wochendeckel, GF-50%,
  "sonstige"); bei Ausfall/Unterdeckung Umverteilung offener Stunden auf Kollegen zeitnah zum
  geplanten AP. Phasen: (1) Einzel-MA-Monatsvorschlag; (2) Cross-MA-Umverteilung. Vor Bau:
  KONZEPT-STUNDENVORSCHLAG anlegen. Offene Frage: Vorschlag je Monat oder ganzer Restzeitraum.
- Uebernommen aus frueheren Sessions: KMU-innovativ PDF-Import; PH §4 Versions-Nachzug;
  Enum-Vereinheitlichung v7_funding_format DEV/PROD; Manuals-Nachzug; Datenhygiene
  Loesch-Kaskade; 'Assistenz GL'-Rolle; Max-foerderbare-Stunden-Chip.

---

## Komponenten / Dateien dieser Etappe (deployed src/)

- src/components/shared/ApStatusModal.tsx (v1.0-10)

**DB:** keine Aenderung.

**Doku:** PFLICHTENHEFT-v5_36.md; GIT-SICHERUNG-v7_9_3-session75.md (diese Datei);
DEPLOY-PROZESS-PZE.md (unveraendert gueltig: main auf origin + cubintec).
