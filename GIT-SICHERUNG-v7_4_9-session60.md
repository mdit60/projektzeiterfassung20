# GIT-SICHERUNG - Session 60

**Datum:** 25. Juni 2026
**SW-Release:** V7.5.0 (Meilenstein - von V7.4.9 angehoben)
**Pflichtenheft:** v5.11
**Branch:** main (PROD deployed) / v7-dev
**Deploy-Kette main (origin + cubintec):** b3993b1 -> 4e54294 -> ee6f1f8 -> e003f01 -> 0303beb -> fc301c2

---

## Zusammenfassung

Sechs Punkte erledigt und in PRODUKTION deployt. Die SW-Release wurde auf
**V7.5.0** angehoben, weil mit den zentralen projektuebergreifenden Abwesenheiten
(A-034, Session 58/59) und der jetzt sauberen Multiprojekt-Faehigkeit ein
inhaltlicher Meilenstein stabil im Produktivbetrieb laeuft.

Der groesste Teil der Session war die Fehlersuche an den ZA-Anlagen, die in PROD
faelschlich "Keine Zeiterfassungsdaten" zeigten - mit einer wichtigen Lehre
(siehe unten). **Keine DB-Migration in dieser Session.**

---

## Erledigte Punkte

### A-036 - Feiertagszelle in der Ausfallzeiten-Zeile sperren
- TimesheetForm v7.4.6-49.
- U/K rendern an Feiertagen keinen Input, S bleibt sichtbar aber disabled, alle
  drei orange. Schliesst die Luecke, dass U/K an Feiertagen speicherbar waren
  (der Speicher-Guard deckte bisher nur S ab).

### A-037 - Footer-Build-Marker automatisch
- PortalFooter v7.4.9-3.
- Hardcodiertes "Build 43" ersetzt durch den Vercel-Commit-SHA:
  `(process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev').slice(0, 7)`.
- Verlaesslicher Live-Deploy-Nachweis: ein `grep` auf `main` zeigt nur, was
  committet ist, nicht was deployt ist - der Footer-Hash zeigt den wirklich
  ausgelieferten Stand. (Setzt "Enable System Environment Variables" in Vercel
  voraus, ist aktiv.)

### A-038 - Fokus-Weitersprung nach Abwesenheit
- TimesheetForm v7.4.6-49 (zusammen mit A-036).
- Nach Eingabe eines Abwesenheitscodes in einer AP-Zelle springt der Fokus zur
  naechsten buchbaren AP-Zelle. Behebt den Fokusverlust, den die 2c-Sperre aus
  v7.4.6-47 ausloeste (die getippte Zelle wurde disabled -> Fokus weg -> Enter
  ohne Wirkung).

### A-040 - .limit(10000) auf v7_timesheets wiederhergestellt
- useBerichteData v1.0.3.
- Das `.limit(10000)` war beim A-034-Umbau (v1.0.2) verloren gegangen. Ohne
  Limit deckelt Supabase die Antwort beim Default von 1000 Zeilen. Wiederhergestellt
  an der v7_timesheets-Query (zusaetzlich zur work_packages-Query).
- HINWEIS: War am Ende NICHT die Ursache des ZA-Problems (HEATS hatte 1096 < 10000),
  aber ein echter, noetiger Regressions-Fix fuer grosse Firmen.

### A-041 - React #418 (Hydration-Mismatch) im ZAPanel
- ZAPanel v7.4.4-53.
- mounted-Gate: Server- und erster Client-Render liefern denselben Platzhalter,
  der eigentliche Inhalt rendert erst nach dem Mount auf dem Client. Beseitigt
  den #418-Absturz im Production-Build. Reiner Render-Zeitpunkt, keine Aenderung
  an Daten- oder ZA-Logik.
- HINWEIS: Der #418 war ein echtes, behobenes Symptom - aber NICHT die Ursache
  fuer die fehlenden Daten (paralleles Symptom).

### A-042 - ZA-Auto-Auswahl + Einreichdatum + Archiv-Ausrichtung
- ZAPanel v7.4.4-56 (Zwischenstaende: -54 temporaere Diagnose, danach entfernt; -55 erste,
  unvollstaendige Auto-Auswahl).
- (1) Konsolidierter Effekt waehlt beim Laden GENAU EINMAL die richtige ZA aus
  (per initialZaId vorgegeben ODER die zuletzt gespeicherte) und laedt sie wirklich
  ins Formular. Behebt, dass beim Oeffnen ein leerer Neu-Entwurf mit
  `zeitraum_bis = heute` stand und die Anlagen leer blieben.
- (2) Einreichdatum leer per Default (3 Stellen: useState, loadZAIntoForm, openPanel-
  Neu-Entwurf). Vorher heute -> ein Entwurf wurde beim Speichern automatisch als
  "eingereicht" markiert.
- (3) Archiv-Tab: Spalte Zahlungseingang-Betrag rechtsbuendig -> Ueberschrift steht
  ueber dem Eingabefeld.

---

## Der grosse Umweg (Lehre)

Die ZA-Anlagen 1a/1b zeigten in PROD bei mehreren Firmen (HEATS / AS System,
VETIS / Automotive Synergies, Selaflex-DS) "Keine Zeiterfassungsdaten", obwohl die
Daten per SQL nachweislich vollstaendig und korrekt vorhanden waren.

Geprueft und nacheinander ausgeschlossen: Supabase-`.limit()`, Supabase-Max-Rows
(stand bereits auf 10000), RLS, Firmen-ID-Zuordnung, Projekt-Status (`is_active`),
DEV/PROD-Schema-Diff, React #418 (Hydration). Auffaellig: in `pnpm dev` (auch gegen
PROD-Daten) funktionierte es, im Vercel-Production-Build nicht.

**Echte Ursache (per Diagnose-`console.log` ZA-DIAG gefunden):** Beim Oeffnen war
**keine** ZA ausgewaehlt. Der Abrechnungszeitraum defaultete auf `new Date()` (heute),
also nur "Juni 26". Abgeschlossene Projekte (HEATS endet Mai 26) haben im aktuellen
Monat keine Stunden -> leer. Sobald man eine gespeicherte ZA anklickte, erschienen
die Daten sofort. Das automatisch eingetragene heutige Einreichdatum hat zusaetzlich
in die Irre gefuehrt.

### Lehren fuer kuenftige "zeigt keine Daten"-Faelle
1. **Zuerst die Laufzeit-Parameter messen** (was ist ausgewaehlt, welcher Zeitraum,
   welche Filter), bevor technische Hypothesen deployt werden. Ein fruehes
   Diagnose-Log haette Stunden gespart.
2. **Leere UI-Zustaende muessen Ursache + Handlungsanweisung zeigen**, nicht nur
   "Keine Daten". (A-042 behebt genau diesen Zustand.)
3. **`pnpm dev` lief lokal auf DEV** (`.env.local` zeigte auf
   `jaiyycmstgepxaqsvnjd`) -> Problem lokal nie reproduzierbar. PROD-Test braucht
   PROD-Env im Production-Build.
4. **`new Date()` als Default fuer Datum/Zeitraum** erzeugt irrefuehrende Zustaende
   und sollte vermieden werden.
5. Ein auffaelliges Symptom (#418 in der Konsole) ist nicht automatisch die Ursache -
   sauber zwischen "auffaelligem Symptom" und "der gemeldeten Nutzer-Beobachtung"
   trennen.

---

## Deploy-Kette (main, beide Remotes origin + cubintec)

| Merge auf main | Inhalt | Footer-Hash live |
|----------------|--------|------------------|
| b3993b1 | A-036 + A-037 + A-038 (TimesheetForm v7.4.6-49, PortalFooter v7.4.9-3) | b3993b1 |
| 4e54294 | A-040 (useBerichteData v1.0.3, .limit(10000)) | 4e54294 |
| ee6f1f8 | A-041 (ZAPanel v7.4.4-53, mounted-Gate) | ee6f1f8 |
| e003f01 | Diagnose v7.4.4-54 (temporaer, ZA-DIAG console.log) | e003f01 |
| 0303beb | A-042 erste Fassung (ZAPanel v7.4.4-55) | 0303beb |
| fc301c2 | A-042 final (ZAPanel v7.4.4-56) | fc301c2 |

---

## Geaenderte Dateien (Session 60)

| Datei | Version | Status |
|-------|---------|--------|
| PortalFooter.tsx | 7.4.9-3 | deployt (A-037) |
| TimesheetForm.tsx | 7.4.6-49 | deployt (A-036 + A-038) |
| hooks/useBerichteData.ts | 1.0.3 | deployt (A-040) |
| ZAPanel.tsx | 7.4.4-56 | deployt (A-041 + A-042); -53/-54/-55 sind Zwischenstaende |

---

## Datenbank

**Keine DB-Migration in Session 60.** Reine Code-Aenderungen.

---

## Offene Punkte

**Neu:**
- **A-039** - PortalFooter dauerhaft ueberall sichtbar (auch im Cockpit; erscheint
  bisher nur auf Firmenseiten, nicht im Cockpit).
- **A-043** - Arbeitsplan / Arbeitspakete-Uebersicht als Druck-/PDF-Ansicht
  (Plan vs. Ist je AP und Person). Nutzen: bei Multiprojekt-Firmen erkennen, wo zu
  viele Stunden auf ein Projekt gebucht wurden und beim anderen fehlen.

**Unveraendert offen:** A-001 (Berater-Portal-Manual), A-006 (FZul-Modul-Ausbau),
A-012 (Standalone-Seiten), A-013 (Legacy/Dead-Code-Cleanup), A-019 (Namens-
Vereinheitlichung K/C).

**Backlog/Infrastruktur:** RLS-Angleich DEV/PROD fuer v7_employee_absences und
v7_timesheets; Supabase-Projekttransfer MDBS-Org -> Cubintec-Org; Vercel-Account-
Trennung freiberuflich vs. Cubintec.
