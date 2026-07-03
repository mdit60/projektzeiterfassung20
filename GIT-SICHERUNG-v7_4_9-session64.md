# GIT-SICHERUNG - Session 64

**Datum:** 3. Juli 2026
**SW-Release:** V7.5.4 (Stundennachweis-Ausbau: GF-Fix, Live-Spalte, WAZ-Anzeige, ZA-Link, Auto-Vorbelegung)
**Pflichtenheft:** v5.15
**Branch:** main (PROD deployed) / v7-dev
**Deploy-Stand:** main == cubintec/main == `1e2de08` (beide Remotes deckungsgleich)
fuer TimesheetForm/StundennachweisMatrix/ZASeite; der GF-Fix (v7-types +
MitarbeiterModal) wurde in einem frueheren Commit derselben Session deployt.

---

## Zusammenfassung

Groesserer Stundennachweis-Ausbau in mehreren Paketen, alles in PRODUKTION
deployt (beide Remotes origin + cubintec). KEINE DB-Migration. Eine reine
Datenkorrektur (Katrin Kirchner WAZ-Historie, ueber das MA-Modal).

1. **GF-50%-Regel wieder aktiv** (tolerante Erkennung; echte Umlaute im Dropdown).
2. **Paket A** - rechte "offen"-Spalte live + Farben zurueck.
3. **Paket B** - persoenliche WAZ neben dem MA-Feld + ZA-Direktlink (Timesheet
   und Matrix).
4. **ZA-Ruecksprung-Fix** - Zurueck fuehrt wieder zur Ausgangsseite.
5. **Paket C** - Auto-Vorbelegung "sonstige Arbeiten" (sichere Variante) +
   weicher Save-Hinweis.
6. **Grenzen-Korrektur** - "sonstige Arbeiten" zaehlen nicht mehr in die
   Grenzbetrachtungen.

---

## Erledigte Punkte

### GF-50%-Regel wieder aktiv (v7-types 7.4.9-2, MitarbeiterModal 1.0.3-2, TimesheetForm 7.4.6-60)
- Symptom: Die 50%-Deckelung fuer Geschaeftsfuehrer griff im Timesheet nicht mehr
  (keine GF-Ampel, keine Warnung).
- Ursache: Die GF-Erkennung machte einen EXAKTEN String-Match gegen die
  ASCII-Schreibweise ('Geschaeftsfuehrer'). Die DB enthaelt aber ueberwiegend
  echte Umlaute ('Geschaeftsfuehrer' mit ae-Umlaut) sowie die weibliche Form
  ('Geschaeftsfuehrerin'). Der Match schlug daher fehl -> istGF immer false.
- Fix: Zentraler, toleranter Helfer istGeschaeftsfuehrerTitle() in v7-types
  (normalisiert Umlaut/ASCII, Gross-/Kleinschreibung, weibliche Form). Die
  Position-Auswahlliste (POSITION_OPTIONS) zeigt jetzt echte Umlaute (als
  \u-Escapes im Quelltext -> Datei bleibt ASCII-rein). TimesheetForm und
  MitarbeiterModal nutzen den Helfer; MitarbeiterModal bildet gespeicherte
  Alt-Werte per canonicalPositionTitle() sanft auf die Umlaut-Schreibweise ab.
- Diagnose per SQL (PROD): Mischbestand bestaetigt (echte Umlaute, ASCII, sowie
  'Geschaeftsfuehrerin'). KEINE Datenkorrektur noetig - die tolerante Erkennung
  greift auf alle Schreibweisen.
- LEHRE: position_title ist zugleich sichtbarer UI-Text UND Match-Key. Er darf
  nicht ASCII-fiziert werden; der Vergleich muss normalisieren.

### Paket A - rechte "offen"-Spalte (TimesheetForm 7.4.6-61)
- LIVE: Die offenen/ueberbuchten Stunden zaehlen jetzt schon waehrend der
  Eingabe mit, nicht erst nach dem Speichern. Neuer Live-Schnappschuss
  savedMonthHoursPerWP (beim Laden + nach Speichern gesetzt);
  calculateRemainingHours/calculateWPOpenHours rechnen gebucht_gesamt plus
  Live-Delta (aktueller Formstand - Schnappschuss).
- FARBEN zurueck: offene MA-Stunden GRUEN, ueberbuchte ROT, projektweit offene
  AP-Stunden bei NICHT zugeordnetem MA BLAU (vorher alles ausser Ueberbuchung
  schwarz).

### Paket B - WAZ-Anzeige + ZA-Link (TimesheetForm 7.4.6-62, StundennachweisMatrix 7.4.6-10)
- WAZ-Anzeige: persoenliche Wochenarbeitszeit des MA (weeklyHoursAtMonth aus der
  Teilzeit-Historie) direkt rechts neben dem MA-Feld, z.B. "38 h/Woche".
- ZA-Direktlink: in der Steuerleiste des Timesheets (rechts) und im Karten-Header
  der Matrix. Springt in die Zahlungsanforderung des aktuellen Projekts, gleiche
  Seite, returnTo = aktuelle URL. Portal-abhaengige Route (Berater:
  /v7/berater/foerderung/firma/<id>/za, Firma: /v7/firma/za). Im Timesheet laeuft
  der Sprung ueber checkUnsavedChanges (Warnung bei offenen Aenderungen).
- Platzierung Matrix: Der "Zurueck"-Button liegt im Seiten-Wrapper, nicht in der
  Shared-Komponente. Der ZA-Link wurde daher in den Matrix-Karten-Header gesetzt
  (print:hidden -> erscheint nicht im PDF/Sammeldruck) - eine Aenderung deckt
  beide Portale ab.

### ZA-Ruecksprung-Fix (ZASeite 1.0.10)
- Symptom: Aus der ZA fuehrte "Zurueck" immer ins Standard-Dashboard, nicht auf
  die Ausgangsseite (Timesheet bzw. Matrix).
- Ursache: zurueckUrl in ZASeite kannte nur den Alt-Sentinel returnTo='cockpit'
  bzw. Portal-Defaults; ein konkreter returnTo-PFAD wurde ignoriert (Firma:
  immer /v7/firma/dashboard).
- Fix: Beginnt returnTo mit '/', wird direkt dorthin zurueckgesprungen.
  Alt-Sentinel 'cockpit' und Portal-Defaults bleiben unveraendert;
  startsWith('/') schuetzt vor externen Zielen.

### Paket C - Auto-Vorbelegung "sonstige Arbeiten" (TimesheetForm 7.4.6-63)
- Auto-Wert je reinem Arbeitstag = max(0, pWAZ/5 - dieses Projekt - andere
  Projekte). Der Abzug der anderen Projekte haelt die projektuebergreifende
  Tagesgrenze eingehalten (kein harter Kapazitaets-Block).
- Neuer Monat: leere Arbeitstage werden aufgefuellt + Auto-Werte live
  nachgefuehrt. Gespeicherter Monat: nur bereits gefuellte Tage werden
  nachgefuehrt, leere Tage bleiben in Ruhe (schuetzt bewusste Loeschungen vor
  Re-Fill). Manuell angefasste Tage werden nie automatisch veraendert.
  Abgeschlossene Monate bleiben unangetastet.
- Weicher Save-Hinweis: Nach dem Speichern gelbe Info, wenn es reine
  Arbeitstage mit Projektstunden, aber leerer "sonstige"-Zeile und nicht voller
  Tagesarbeitszeit gibt (die bewusst/versehentlich offen gelassenen Faelle).
  Blockiert NICHT.
- BEWUSSTE ENTSCHEIDUNG (sichere Variante): Beim Speichern werden 0-/leere
  "sonstige"-Zeilen nicht als Datensatz abgelegt (ununterscheidbar von "noch
  nicht bearbeitet"). Deshalb kein automatisches Auffuellen leerer Tage in
  gespeicherten Monaten; der Save-Hinweis faengt die Luecken ab.

### Grenzen-Korrektur - sonstige raus (TimesheetForm 7.4.6-64)
- Vorgabe: Foerderrelevant sind ausschliesslich die foerderbaren Projektstunden;
  "sonstige Arbeiten" sind nicht foerderbar und duerfen keine Obergrenze
  ausloesen.
- 1) 9h-Tagesgrenze: calcTagSumme rechnet nur noch foerderbare Projektstunden
  (frueher Projekt + sonstige). Cross-Projekt-Tagessumme = foerderbar dieses
  Projekt + andere Projekte.
- 2) Physische Monatskapazitaet: sonstStundenMonat entfernt; jetzt nur
  foerderbare Projektstunden + andere Projekte. Ein langer Monat mit vielen
  Arbeitstagen sprengt die Grenze nicht mehr allein durch die Auto-Vorbelegung
  (Symptom: 184h "sonstige" -> "Speichern gesperrt").
- Die monatliche FOERDER-Obergrenze (173,33 x Faktor) rechnete ohnehin nur mit
  foerderbaren Projektstunden - unveraendert. Anzeige-Summen (Tages-Marker in
  der "Summe foerderbare Stunden"-Zeile) ebenfalls schon korrekt - unveraendert.

---

## Datenkorrektur (kein Code, keine Migration)

### Katrin Kirchner - WAZ-Historie
- Symptom: Im Timesheet wurde bei Katrin 38 h/Woche angezeigt (Firmenstandard)
  statt der reduzierten 28 h.
- Diagnose per SQL (PROD): Stammsatz weekly_hours=28, aber der einzige
  Historie-Eintrag (gueltig ab 2022-01-01) stand auf 38. Die Ladelogik nimmt
  zuerst den Historie-Eintrag, der am Monatsersten gueltig ist (Historie hat
  Vorrang vor Stammsatz) -> die 38 gewann in jedem Monat.
- Fachliche Klaerung: Katrin war immer 38 h und wurde zum 01.08.2025 auf 28 h
  reduziert (YachtConnect Phase 2, echte Gesamt-Reduzierung, nicht nur
  Projektanteil).
- Korrektur (durch Martin, ueber das MA-Modal): neuer Historie-Eintrag 28 h
  gueltig ab 01.08.2025. Der 38er-Eintrag ab 2022 bleibt stehen. Ergebnis:
  Monate bis Juli 2025 -> 38 h, ab August 2025 -> 28 h (5,6 h/Tag).
- LEHRE: Die Historie ist PERSONENbezogen (nicht projektbezogen) und steuert
  Tagesstunden, Auto-Vorbelegung und Grenzen in ALLEN Projekten. Ein reiner
  Projektanteil gehoert in pm_basis_weekly_hours am Projekt, nicht in die
  Historie.

---

## Geaenderte Dateien

| Datei (downloads) | Ziel in src/ | Version |
|-------------------|--------------|---------|
| v7-types-v7_4_9-2.ts | src/types/v7-types.ts | 7.4.9-2 |
| MitarbeiterModal-v1_0_3-2.tsx | src/components/shared/MitarbeiterModal.tsx | 1.0.3-2 |
| TimesheetForm-v7_4_6-64.tsx | src/components/shared/TimesheetForm.tsx | 7.4.6-64 |
| StundennachweisMatrix-v7_4_6-10.tsx | src/components/shared/StundennachweisMatrix.tsx | 7.4.6-10 |
| ZASeite-v1_0_10.tsx | src/components/shared/ZASeite.tsx | 1.0.10 |

Hinweis: TimesheetForm v7.4.6-64 enthaelt die Zwischenbuilds -60 (GF-Fix), -61
(Paket A), -62 (Paket B), -63 (Paket C). Nur -64 ist der finale Stand; die
Zwischenbuilds wurden teils einzeln getestet/deployt.

---

## Deploy (bereits ausgefuehrt, hier zur Dokumentation)

GF-Fix (frueherer Commit dieser Session):

```
git add src/types/v7-types.ts src/components/shared/MitarbeiterModal.tsx src/components/shared/TimesheetForm.tsx
git commit -m "fix(gf): 50%-Regel wieder aktiv - tolerante GF-Erkennung (Umlaut/ASCII + weibliche Form), echte Umlaute im Position-Dropdown"
git push origin v7-dev
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git push cubintec main && git checkout v7-dev
```

Rest (Commit 1e2de08, beide Remotes):

```
git add src/components/shared/StundennachweisMatrix.tsx src/components/shared/TimesheetForm.tsx src/components/shared/ZASeite.tsx
git commit -m "feat(timesheet): live offen-Spalte+Farben, WAZ-Anzeige, ZA-Link+Ruecksprung-Fix, Auto-Vorbelegung sonstige Arbeiten, sonstige raus aus Grenzen"
git push origin v7-dev
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git push cubintec main && git checkout v7-dev
```

Verifiziert: `67e9e70..1e2de08 main -> main` auf origin UND cubintec (identischer SHA).

---

## Offene Punkte (unveraendert)

A-001 (Berater-Portal-Anleitung), A-006 (FZul-Modul), A-012 (standalone pages),
A-013 (dead code cleanup), A-019 (naming consistency), A-039 (PortalFooter
ueberall), A-043 (Arbeitsplan-Druckansicht); A-034-Restpunkt (RLS-Angleich
DEV/PROD im Backlog).

## Komponentenversionen (Stand Session 64)

TimesheetForm v7.4.6-64, StundennachweisMatrix v7.4.6-10, ZASeite v1.0.10,
v7-types 7.4.9-2, MitarbeiterModal v1.0.3-2.
