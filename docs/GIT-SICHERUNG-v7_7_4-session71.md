# GIT-SICHERUNG - Session 71

**Datum:** 19. Juli 2026
**SW-Release:** V7.7.4 (ZAPanel - Anzeige-Umlaute im ganzen ZA-Panel korrekt - in PRODUKTION)
**Pflichtenheft:** v5.26
**Branch:** main = PROD (deployed) / v7-dev
**Deploy-Stand:** **V7.7.4 ist in PROD.** merge v7-dev -> main (--no-ff), push origin + cubintec,
Vercel-Deploy auf pze.cubintec-hub.com verifiziert (Production-Commit **b4e8610** = main/Production,
in PROD sichtbar korrekt). **Reine Anzeige-Text-Aenderung (ASCII-Konvention) an einer
Shared-Komponente - KEIN Tabellen-, Enum- oder Migrationsschritt.**

---

## Anlass

Im laufenden Betrieb (ZA-Deckblatt einer ZIM-DS-Zahlungsanforderung) gemeldet: In der Spalte
Kostenart und in weiteren Feldern des ZA-Panels standen Umlaute als ASCII-Transliteration
(ae/oe/ue) statt als echte Umlaute - z.B. "Zuschlag fuer uebrige Kosten", "Kosten der Auftraege
an wiss. qual. Dritte", "Foerderkennzeichen", "Zuwendungsfaehige Kosten". Das widerspricht der
projektweiten Vorgabe, in der deutschen SaaS echte Umlaute (ae/oe/ue -> die echten Zeichen)
anzuzeigen. Der Befund war NICHT auf die Kostenart-Spalte beschraenkt, sondern zog sich durch
das ganze Panel (rund 50 Anzeige-Textstellen ueber alle Tabs).

---

## Erledigte Punkte

### FIX: Anzeige-Umlaute im gesamten ZA-Panel (ASCII-konform)

- `ZAPanel.tsx` v7.4.4-59 (Ausgangsstand in downloads/) -> **v7.4.4-61** (downloads -> src/).
- **Umfang:** rund 50 Anzeige-Textstellen ueber Deckblatt, NWM-Kostentabelle, Kostentabelle,
  Anlage 1a/1b, Formular-Hinweise (3x) sowie die Loesch- und "Ungespeicherte Aenderungen"-Dialoge.
- **Kernursache der ersten Fehlmessung (Lehre):** `\u`-Escapes wirken NUR in
  JS-String-Literalen. In JSX-Textknoten (Text zwischen den Tags, z.B. `>Foerderkennzeichen<`)
  ist `\u00f6` KEIN Escape, sondern woertlicher Text. Ein erster Build (ZAPanel-**60**), der
  pauschal `\u`-Escapes einsetzte, zeigte deshalb "F\u00f6rderkennzeichen" woertlich auf dem
  Deckblatt - waehrend die Titelzeile (aus einem JS-String-Ausdruck) korrekt "FUER" ->
  "FUER"/echtes UE rendern konnte. Genau dieser Unterschied war das Diagnose-Signal.
- **Korrektur (ZAPanel-61), zwei Techniken sauber getrennt:**
  1. **JSX-Textknoten -> HTML-Entities** (`&auml;` `&ouml;` `&uuml;` `&Auml;` `&Ouml;`
     `&Uuml;` `&szlig;`). Diese sind ASCII-konform und werden vom JSX-Compiler (SWC/Next.js,
     esbuild, Babel identisch) zu echten Umlauten dekodiert - dieselbe Klasse benannter
     Entities wie die im Panel bereits genutzten `&nbsp;`, `&rsaquo;`, `&ndash;`.
  2. **JS-String-Literale -> `\u`-Escapes** (bleiben): Format-Map (FUNDING_FORMAT_LABELS),
     Alert-/Confirm-Texte und der Titel-Ausdruck rendern damit korrekt.
- **Empirischer Nachweis:** esbuild-Transform der Entities ergibt echte Umlaut-Bytes
  (`&uuml;` -> `\xFC`, `&auml;` -> `\xE4`, `&szlig;` -> `\xDF`, `&Uuml;` -> `\xDC`,
  `&Ouml;` -> `\xD6`).
- **Chirurgisch:** NUR Anzeige-String-Literale geaendert. Byte-genau UNVERAENDERT: alle
  Bezeichner und DB-Felder (`auftraege_dritte_t/_nt`, `foerdersatz*`, `nwmKostenUebrige`,
  `nwm_kosten_uebrige`, `foerderbetrag_gesamt`, `computeArchivFoerderbetrag`) sowie saemtliche
  Quelltext-Kommentare. Bezeichner-Zaehlungen vor/nach identisch verifiziert.
- **Keine Logikaenderung:** calcStatus, Foerderbetrag-Persistenz, Option-B-DB-Load, Deep-Link
  und Druck unangetastet -> Verhaltensvertrag ZA-01..ZA-11 intakt.
- **ASCII-konform geprueft** (keine Nicht-ASCII-Zeichen im Quelltext) + esbuild-Parse gruen.

### §4-Nachzug ZAPanel (Zwischenstaende, die in v5.25 fehlten)

Die §4-Komponententabelle listete ZAPanel noch auf 7.4.4-56. Nachgezogen:

- **v7.4.4-57:** FIX ZA-Druck in Firefox (Popup wurde im selben Tick nach `print()` geschlossen
  -> Dialog gekillt, Fenster blitzte auf).
- **v7.4.4-58:** ZA-Druck komplett robust ueber ein unsichtbares iframe statt Popup (kein
  Popup-Blocker, kein wegblitzendes Fenster, exakt der sichtbare ZA-Bereich, Doppeldruck-Schutz).
- **v7.4.4-59:** ZA-Stundensatz dreistufig gehaertet (1. anerkannter/gekuerzter Traeger-Satz
  AS-IS; 2. sonst kalkulatorischer Satz auf Antrags-WAZ skaliert; 3. sonst sichtbare Warnung in
  Anlage 1b statt stiller 0).

---

## Code-Integration (Status) - Session 71

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| ZAPanel-v7_4_4-61.tsx | src/components/shared/ZAPanel.tsx | INTEGRIERT + DEPLOYED (V7.7.4, b4e8610) |

Legende: INTEGRIERT = per `cp` nach `src/` uebernommen; DEPLOYED = via v7-dev -> main in PROD.

Hinweis: Der Zwischenbuild ZAPanel-v7_4_4-60.tsx (ASCII-Transliteration, dann durch die
Entity-Loesung -61 abgeloest) wandert mit -59 nach downloads/archiv/code/.

---

## Deploy V7.7.4

- Reine Anzeige-Text-Aenderung, keine SQL-Migration, keine Enum-Aenderung.
- Integration downloads -> src (`ZAPanel-v7_4_4-61.tsx` -> src/components/shared/ZAPanel.tsx),
  DEV-Test (Umlaute korrekt, Betraege unveraendert), Commit auf v7-dev, merge v7-dev -> main
  (--no-ff), push origin + cubintec, Vercel-Deploy verifiziert (Production **b4e8610**).
- Verifikation in PROD (pze.cubintec-hub.com): Deckblatt zeigt "Foerderkennzeichen" ->
  "Foerderkennzeichen" mit echtem OE usw.; "Zuschlag fuer uebrige Kosten", "Kosten der
  Auftraege", "Zuwendungsfaehige Kosten", "Anteilige Zuwendung (70% Foerdersatz)" alle mit
  echten Umlauten; Betraege unveraendert (20.474,52 / 14.299,10 / 34.773,62 / 24.342,00).

---

## Lehren

- **`\u`-Escape vs. HTML-Entity - der Kontext entscheidet:** `\u00XX` wirkt NUR im
  JS-String-Literal; im JSX-Textknoten ist es woertlicher Text. Regel projektweit:
  Kommentare -> ae/oe/ue (ASCII); JS-String-Literale -> `\u`-Escapes; JSX-Textknoten ->
  HTML-Entities (`&auml;` `&ouml;` `&uuml;` `&Auml;` `&Ouml;` `&Uuml;` `&szlig;`).
- **Ein Umlaut-Fehler zeigt sich zuerst an der Stelle, die schon funktioniert:** Dass die
  Titelzeile korrekt renderte, aber die Feldbeschriftungen nicht, war der schnellste Hinweis
  auf die JS-String-vs-JSX-Text-Ursache - nicht auf ein "halb eingespieltes" File.
- **Bezeichner-Schutz bei Massen-Ersetzung:** Vor globalen String-Ersetzungen die Wortstaemme
  gegen Code-Bezeichner pruefen (z.B. "Foerdersatz" steckt auch in `nwmFoerdersatz`,
  `getFoerdersatzNWM`) und ausschliesslich kontextgenaue (JSX-/Quote-gebundene) Ersetzungen
  vornehmen; danach Bezeichner-Zaehlungen vor/nach vergleichen.

---

## Offen / naechste Schritte

Unveraendert aus Session 70 uebernommen:

- **Enum-Vereinheitlichung DEV/PROD** (`v7_funding_format`, Richtung B): TS-Typ + beide
  DB-Enums + Projektdaten + Dropdowns angleichen. Latenter Bug: Nicht-ZIM-Format im
  Projektformular kann in PROD am Enum scheitern.
- **Berater-Einstiege konsolidieren:** vier hartkodierte Navigations-Stellen (PortalNav,
  berater/dashboard, AppNav, app/cockpit) in eine gemeinsame Liste zusammenfuehren, moeglichst
  gemeinsam mit der §8-Umbenennung (Config-Label "Multiprojekt-Tool" vs. UI
  "Kapazitaetsplanung").
- **Multijahr-Feinschliff:** Tagesarbeitszeit je Jahr aus Teilzeit-Historie statt
  Vorhaben-Stichtag.
- **BSFZ-Bescheinigungsbeantragung:** einziger fachlich offener Rest eines separaten
  FZul-Moduls (KONZEPT-MULTIPROJEKT-FZUL §8).
- **Spaeter/separat (neue Funktion):** "freie" FZul-Zeit intelligent auf konkrete
  FZul-Vorhaben verteilen.

Ferner offen (Backlog): A-001 (Berater-Manual), Manuals-Nachzug (PDF-Antragsimport),
Datenhygiene Loesch-Kaskade verwaiste MA, A-034-Restpunkt (RLS-Angleich DEV/PROD),
'Assistenz GL'-Rolle (admin_assistant), Max-foerderbare-Stunden-Chip in TimesheetForm.

---

## Komponenten / Dateien dieser Session

**Geaendert & deployed (src/):**
- `src/components/shared/ZAPanel.tsx` (v7.4.4-61)

**Unveraendert (bewusst):**
- Keine DB-, API- oder Typ-Aenderungen.

**DB:**
- Keine Migration.

**Doku:**
- `PFLICHTENHEFT-v5_26.md` (Session 70 + 71 nachgezogen; §4 ZAPanel 7.4.4-61, TimesheetForm 7.4.6-65)
- `GIT-SICHERUNG-v7_7_4-session71.md` (diese Datei)
- `PZE-Upload-Checkliste-Session71.xlsx` (PV-Soll-Stand nach Session 71)
