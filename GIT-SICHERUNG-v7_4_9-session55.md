# GIT-SICHERUNG - Session 55

**Datum:** 22. Juni 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v5.06
**Branch:** v7-dev -> main (beide Remotes)

---

## Zusammenfassung

Erste Firma mit zwei parallelen Projekten (Selaflex GmbH: InGrav + GRAVID, MA
Linfert in beiden Teams) hat zwei Stellen aufgedeckt, an denen PZE die Projekte
nicht sauber getrennt hat. Beide behoben (A-032, A-033). Ausserdem als
Folgethema das Konzept fuer projektuebergreifende Abwesenheiten erarbeitet und
abgenommen (A-034, Umsetzung als eigene DB-Session).

---

## Erledigte Anforderungen

### A-032 - Stundennachweis-Matrix: MA-Zeilen auf aktives Projekt filtern

**Dateien:**
- `src/components/shared/StundennachweisMatrix.tsx` -> **v7.4.6-4**
- `.../firma/[id]/cockpit/stundennachweis/page.tsx` -> **v7.4.9-6**

- Symptom: Bei einer Firma mit mehreren Projekten zeigte die Matrix alle
  Teammitglieder aller Projekte, unabhaengig vom oben gewaehlten Projekt.
- Ursache: Die MA-Zeilen entstanden aus ALLEN `projectAssignments` ohne
  Projektfilter (`assignedEmployeeIds` aus der ungefilterten Liste). Das
  Interface `ProjectAssignment` deklarierte `project_id` nicht, obwohl es zur
  Laufzeit (aus `loadProjectAssignments`) vorhanden ist.
- Fix Matrix v7.4.6-4: `projectAssignmentsForActive = projectAssignments.filter(
  pa => pa.project_id === activeProjectId)`; MA-Liste, Sortierung und die
  MA-spezifischen Start/End-Grenzen nutzen die gefilterte Liste. `project_id`
  ins Interface ergaenzt.
- Fix Wrapper v7.4.9-6: `assignment_start/end` je **MA + Projekt**
  zusammenfuehren (vorher nur je MA -> ein MA in mehreren Projekten konnte die
  Datumsgrenzen des falschen Projekts erben). `project_id` in die assignDates-
  Query aufgenommen, Merge matcht employee_id + project_id.
- Wirkt automatisch auch in der BerichtePage-Matrix (gleiche Komponente,
  Assignments tragen project_id ueber loadProjectAssignments).
- Verifiziert live an Selaflex: Projektwechsel filtert die MA-Zeilen, Linfert
  erscheint in beiden Projekten, die anderen nur im eigenen.

### A-033 - Zeiterfassung: MA-Auswahl aufs Projektteam beschraenken (Teil 2a)

**Datei:** `src/components/shared/TimesheetForm.tsx` -> **v7.4.6-37**

- Symptom: Im Stundenerfassungs-Formular waren alle Firmen-MA waehlbar, auch
  solche, die dem Projekt gar nicht zugeordnet sind.
- Ursache: Das Formular lud das Projektteam (`teamNumbers`) zwar, nutzte es aber
  nur zum Sortieren, nicht zum Filtern.
- Fix v7.4.6-37: Neues `teamMemberIds` (alle dem Projekt zugeordneten MA, auch
  ohne employee_number); abgeleitetes `teamEmployees` filtert das Dropdown auf
  diese. Der aktuell gewaehlte MA bleibt sichtbar (Deep-Link / Reset-Latenz).
  Beim Projektwechsel automatische Umstellung auf den ersten Team-MA, falls der
  aktuelle nicht zum Team gehoert. Faellt das Team leer (Ladephase / Projekt
  ohne Team) -> Fallback volle Liste (kein leeres Dropdown). Gehaertete Logik
  unberuehrt.

### Bestaetigt (kein Code): projektuebergreifender 9h-Tagesdeckel

Die Cross-Projekt-Tagesgrenze (A-021, `otherProjectHours` +
`calcCrossProjectTagSumme`, harte Sperre + Druck-Sperre + rote Zelle) greift
bereits **generell** fuer jede Mehr-Projekt-Firma, nicht nur bei NWM. Dein
8h-Beispiel (Linfert 8h GRAVID + Versuch in InGrav am selben Tag) ist damit
abgedeckt.

---

## Offen / Konzept abgenommen

### A-034 - Projektuebergreifende Abwesenheiten (zentrale Tabelle)

**Konzept:** `KONZEPT-ABWESENHEITEN-ZENTRAL-v1_1.md` (abgenommen)

- Abwesenheit ist mitarbeiter-, nicht projektbezogen: einmal erfassen, in allen
  Projekten des MA wirksam (kein Doppeleintrag), Aenderung/Ruecknahme ueberall.
- Geklaert: genau ein Code/Tag, keine Teilabwesenheit, 9h-Deckel = Summe der
  Arbeitsstunden ueber alle Projekte, Feiertage bleiben berechnet,
  Abwesenheitstag sperrt Arbeit projektuebergreifend hart.
- Umsetzung als eigene DB-Session: neue Tabelle `v7_employee_absences`
  (partieller UNIQUE employee_id+work_date fuer is_active=true), Migration der
  Abwesenheits-Zeilen aus `v7_timesheets` (Backup + Konflikt-Klaerungsliste),
  dann Lesepfade (Matrix/Sheet/Berichte) + Schreibpfad TimesheetForm + harte
  Cross-Projekt-Abwesenheitssperre. DEV -> Verifikation -> PROD.

---

## Geaenderte Dateien (Deploy-Reihenfolge)

1. `src/components/shared/StundennachweisMatrix.tsx` (v7.4.6-4)
2. `.../firma/[id]/cockpit/stundennachweis/page.tsx` (v7.4.9-6)
3. `src/components/shared/TimesheetForm.tsx` (v7.4.6-37)

Keine DB-Migration in dieser Session.

---

## Doku-Nachzug

- §4.1: StundennachweisMatrix 7.4.6-3 -> 7.4.6-4; TimesheetForm 7.4.6-30 ->
  7.4.6-37 (Zwischenbuilds -31 Kurzarbeit+Rechtsklick, -32/-33 Fehlzeiten-Fixes,
  -34/-35 Wochenend-Erfassung nicht-foerderbar, -36 Rahmen-Fix Tailwind 4 waren
  deployed, in §4 nicht reflektiert).
- §4.3: cockpit-stundennachweis page als Zeile ergaenzt (7.4.9-6).
- §12.1: A-032/A-033 erledigt, A-034 offen.
- Pflichtenheft v5.06, Status rotiert (55 -> Status, 54 -> Vorgaenger,
  53 -> Aeltere Sessions).

---

## Deploy-Notiz

PROD baut nur `main`; Push auf beide Remotes (origin + cubintec). Teil 1
(Matrix v7.4.6-4 + cockpit-stundennachweis v7.4.9-6) ist live verifiziert. Teil
2a (TimesheetForm v7.4.6-37) ausgeliefert. Doku-Commit (Pflichtenheft v5.06 +
diese GIT-Sicherung) auf v7-dev, dann Merge nach main und Push auf beide
Remotes.
