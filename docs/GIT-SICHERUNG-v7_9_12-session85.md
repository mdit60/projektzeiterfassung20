# GIT-SICHERUNG - Session 85 (V7.9.12)

**Datum:** 17. September 2026
**SW-Release:** V7.9.12 (Monatsstatus Stundennachweis-Matrix und Mein Status,
Monatsabschluss speichert immer) - in PRODUKTION
**Pflichtenheft:** v5.46
**Verhaltensvertrag:** v1.4
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_11-session83.md (Session 84 war reine Doku).

**Stand main / v7-dev / Tag:** siehe Ausgabe des Sicherungsbefehls (git log). Release-Tag
`v7.9.12` wird mit dem Doku-Commit gesetzt und auf origin und cubintec gepusht.

**Deploy-Stand:** In PROD deployt (mehrere Merges, je origin + cubintec). **KEIN SQL**.
Nur lesende Abfragen in PROD.

---

## Ausloeser

Martin, AS System / HEATS: Schulz Juni 2026 - im Stundenblatt 0 Projektstunden,
176 h "sonstige Arbeiten", Monat nicht abgeschlossen; Matrix zeigt gruen ohne Zahl.

## Weg zur Loesung

1. **Matrix -17:** automatisch gruen nur mit foerderbaren Stunden > 0. PROD: Schulz Juni
   orange.
2. **Matrix -18:** Befund Martin: September (laufend) bei allen gruen, weil
   "sonstige" bis Monatsende vorbelegt. Entscheidung Martin: Abschluss nur per Button.
   Neu: dunkelgruen = abgeschlossen, hellgruen = erfasst (nur Vormonate), laufender
   Monat nie automatisch. PROD: wenige hellgruene Monate (ab April), Martin hat die
   meisten manuell abgeschlossen.
3. **Matrix -19:** Befund Martin: Schulz August nach Aufheben des Abschlusses orange
   trotz voller Erfassung. Ursache: Urlaub liegt in v7_employee_absences, die Matrix las
   ihn nur im Sammeldruck. Jetzt geladen (loadEmployeeAbsencesAsTimesheets). PROD:
   August hellgruen; Juli hellgruen (Luecken inzwischen nachgetragen, geprueft).
4. **Matrix -20:** nur Netto-Werktage zaehlen; zusaetzlich Altfehler: holidayCount wurde
   addiert, obwohl countWorkdaysInMonth netto rechnet (Feiertage doppelt).
5. **TimesheetForm -98:** Befund Martin: Duehrkop AURA Juli 2026 abgeschlossen, 0
   foerderbare Stunden, Zeile "sonstige Arbeiten" leer. Ursache: Auto-Vorbelegung
   setzt hasChanges nicht; handleToggleComplete speicherte nur bei hasChanges; im
   abgeschlossenen Monat laeuft keine Vorbelegung. Jetzt: vor Abschluss immer
   speichern. PROD: Duehrkop Mai/Juli per Aufheben + Neu-Abschliessen repariert,
   nach Neuladen gespeichert (bestaetigt).
6. **mein-status v7.4.4-19:** gleiche Statuslogik wie Matrix -20 (eigene Kopie).
   PROD: Duehrkop AURA - Sep orange, Dez-Aug dunkelgruen.

## PROD-Abfragen (nur lesend)

Leer abgeschlossene Monate (Completion ohne Stunden im Projekt), 16 Treffer:
- Global Maritime / AURA, Oezalp 12/2025 (88 h Abwesenheit) und 01/2026 -
  abgeschlossen 10.08.2026 -> Reparatur (Aufheben + Neu-Abschliessen) durch Martin.
- Androlite / WISE (EP201861), Herrler 04/2025-03/2026, abgeschlossen 20.04.2026 (vor
  Auto-Vorbelegung). Innerhalb Zuordnung (assignment_end 2026-03-31). Erfassung ab April
  2025 nicht fortgesetzt -> Klaerung Martin mit Kunde, vorerst unveraendert.
- Androlite / WISE, Haller und Popov 12/2024: vor Beschaeftigungsbeginn, ohne Wirkung.

## Code-Integration (Status) - V7.9.12

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| StundennachweisMatrix-v7_4_6-17.tsx | src/components/shared/StundennachweisMatrix.tsx | deployed, aufgegangen in -18 |
| StundennachweisMatrix-v7_4_6-18.tsx | dto. | deployed, aufgegangen in -19 |
| StundennachweisMatrix-v7_4_6-19.tsx | dto. | deployed, aufgegangen in -20 |
| StundennachweisMatrix-v7_4_6-20.tsx | dto. | DEPLOYED (V7.9.12) |
| TimesheetForm-v7_4_6-98.tsx | src/components/shared/TimesheetForm.tsx | DEPLOYED (V7.9.12) |
| mein-status-page-v7_4_4-19.tsx | src/app/v7/firma/mein-status/page.tsx | DEPLOYED (V7.9.12) |

Je Build: ASCII-Check (0 Nicht-ASCII), `npm run build` lokal fehlerfrei (Martin).

## Beobachtungen (nicht Teil dieser Etappe)

- Mein Status, ZA-Ampel: "Stunden MA (akt. Monat)" zaehlt MA mit irgendeinem Eintrag im
  laufenden Monat. AURA: "01.03.2026, 200 Tage ueberfaellig" - fachlich pruefen
  (letzte ZA erfasst?).
- Mein Status: eigene Feiertagsfunktion ohne holiday_region (Matrix nutzt lib).
- Auto-Vorbelegung zieht Stunden anderer Projekte ab (otherProjectHours) - Werte in
  "sonstige" koennen < Tagesarbeitszeit sein.

## Offen / naechste Schritte

- Androlite/WISE Herrler: Klaerung mit Kunde; ggf. assignment_end auf 2025-03-31
  (SQL erst nach Bestaetigung) oder Nacherfassung.
- Aus Session 83/84 uebernommen: A-066, A-070, A-071, Stammdaten annual_leave_days,
  FZul-Export Ausbau, Alt-Seite src/app/import/page.tsx (A-013) u. a.

## Doku dieser Session

PFLICHTENHEFT-v5_46-AENDERUNGSBLOCK.md; VERHALTENSVERTRAG-v1_4.md;
GIT-SICHERUNG-v7_9_12-session85.md (diese Datei); PZE-Upload-Checkliste-Session85.xlsx;
aufraeumen-session85-v1.zsh.
