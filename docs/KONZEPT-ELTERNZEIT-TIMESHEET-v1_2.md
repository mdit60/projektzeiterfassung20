# KONZEPT: Elternzeit in der Stundenerfassung (Abwesenheitscode E)

**Version:** 1.2
**Datum:** 08.09.2026 (§11 am 09.09.2026 fortgeschrieben; v1.1 am 11.09.2026:
Kapazitätsplanung, §3, §8, §10, §11; v1.2 am 11.09.2026: FZul-Detailseite und
BSFZ-Export, §8, §11, neuer §13)
**Status:** UMGESETZT und in Produktion (siehe §11 Umsetzungsstand)
**Betrifft:** PZE V7, `TimesheetForm`, Lesepfade des Stundennachweises, (ab V7.9.10)
die Kapazitätsplanung und (ab V7.9.11) die FZul-Detailseite mit BSFZ-Export
**Verwandte Konzepte:** KONZEPT-ABWESENHEITEN-ZENTRAL-v1_1.md,
KONZEPT-ARBEITSZEITGRENZEN-v1_4.md, KONZEPT-KAPAZITAETSPLANUNG-v1_1.md

---

## 1. Ziel

Elternzeit war bisher nicht abbildbar. Die vorhandenen Behelfe sind alle falsch:

- `employment_end` setzen oder `is_active = false` → der MA verschwindet aus
  Listen und Historie, obwohl er zurückkommt.
- Jeden Tag mit „S" (Sonstige Abwesenheit) füllen → inhaltlich falsch
  (Elternzeit ist kein Sonderurlaub) und die Abwesenheitssummen im Nachweis
  werden verfälscht.
- Nichts eintragen → der Stundennachweis zeigt leere Monate ohne Begründung.
  Für den Prüfer sieht das nach vergessener Erfassung aus.

**Zielzustand:** In Zeiträumen bekannter Elternzeit werden weder Projektstunden
noch sonstige Arbeitszeiten erfasst; die betroffenen Tage tragen im Nachweis ein
**E** und null Stunden. Damit ist dokumentiert, warum keine Stunden anfielen,
ohne dass PZE einen zweiten Zustandsbegriff einführt.

### 1.1 Bestätigung durch den Projektträger (VDI, Telefonat 08.09.2026)

Martin hat die Frage beim Projektträger VDI angesprochen. Aussage: Für den
Nachweis genügt es, an den betroffenen Tagen bzw. Wochen **nichts einzutragen**;
eine Kennzeichnung als Elternzeit — etwa durch ein „E" — ist willkommen, aber
nicht gefordert.

Damit ist der gewählte Weg extern abgesichert: Der Nachweis bleibt in diesen
Zeiträumen stundenfrei, und das E liefert die Begründung, ohne dass ein
zusätzliches förderrechtliches Konstrukt entsteht.

---

## 2. Abgrenzung: zwei Sachverhalte

### 2.1 Teilzeit während der Elternzeit — kein neues Feature

Das BEEG erlaubt Arbeit bis 32 h/Woche während der Elternzeit; das ist der
häufigere Fall. Er ist bereits vollständig abgedeckt: **neuer Eintrag in der
Wochenstunden-Historie** (`v7_employee_hours_history`), gültig ab dem
Monatsersten, Notiz „Elternzeit". Sollstunden, Monatsgrenze und Ampeln stimmen
danach automatisch.

Die pWAZ des Projekts (`v7_project_assignments.personal_weekly_hours`) und damit
der bewilligte Stundensatz bleiben unverändert — siehe
KONZEPT-ARBEITSZEITGRENZEN-v1_4.md §2.4.

**Wichtig:** Der Code E ist für diesen Fall NICHT vorgesehen. Wer arbeitet,
erfasst Stunden.

### 2.2 Vollständige Elternzeit ohne Arbeit — Code E

Nur hierfür wurde der Abwesenheitscode E eingeführt.

---

## 3. Verworfene Alternative (dokumentiert, damit sie nicht wiederkommt)

Diskutiert wurde eine eigene, zeitraumbasierte Tabelle
`v7_employee_leave_periods` (leave_type, start_date, end_date,
weekly_hours_during) mit daraus abgeleiteter Sperre.

**Verworfen wegen Aufwand-Nutzen.** Sie hätte eine zweite Zustandsebene neben
den Abwesenheiten eingeführt, mit eigener Verwaltungs-UI, eigener Sperrlogik und
eigenen Lesepfaden. Der fachliche Mehrwert gegenüber E-Tagen ist gering: Für die
Projektabrechnung ist allein relevant, dass an diesen Tagen keine Stunden
anfielen. Die Auskunft des Projektträgers (§1.1) bestätigt das.

**Bewusst in Kauf genommen:** Die Sperre wirkt tagesweise und entsteht durch
Erfassung. Wird ein Zeitraum nicht eingetragen, ist er auch nicht gesperrt. Da
Elternzeit im Voraus bekannt ist und über den Bereichsdialog (§6) in einem Zug
erfasst wird, ist das Risiko vertretbar.

**Nicht verloren:** Die E-Tage liegen in `v7_employee_absences` und sind damit
auch für die Kapazitätsplanung auswertbar (verfügbare Kapazität abzüglich
E-Tage). **Umgesetzt in V7.9.10 (11.09.2026), siehe §12.**

---

## 4. Datenmodell

Keine neue Tabelle. Der bestehende zentrale Abwesenheitsdatensatz wurde um einen
Code erweitert.

**`v7_employee_absences`** (projektübergreifend, ohne `project_id`):

```sql
-- Vorher:  CHECK (absence_code IN ('U','K','S'))
-- Jetzt:   CHECK (absence_code IN ('U','K','S','E'))
```

Constraint-Name in beiden Umgebungen: `v7_employee_absences_absence_code_check`.
Migrationsskript: `downloads/SQL-MIGRATION-absence-code-E-dev-v1.sql` (ermittelt
den Namen selbst per DO-Block, daher auch auf PROD unverändert einsetzbar).

**Feldbelegung eines E-Tages:**

| Spalte | Wert |
|--------|------|
| `absence_code` | `'E'` |
| `hours` | `0` (nicht die Tagessollstunden) |
| `work_date` | der Kalendertag |
| `note` | `'Elternzeit'` |

Da die Tabelle kein `project_id` führt, gilt ein E-Tag automatisch in **allen**
Projekten des MA, sofern das Zuordnungsfenster
(`assignment_start`/`assignment_end`) den Tag einschließt — dieselbe Regel wie
bei U/K/S (KONZEPT-ABWESENHEITEN-ZENTRAL-v1_1.md §4.4).

---

## 5. Verhalten

### 5.1 Wirkung eines E-Tages

- **Null Stunden.** E ist der erste Abwesenheitscode mit `hours = 0`. Er fließt
  weder in die Abwesenheitssummen noch in die Monatssumme ein.
- **Sperre des Tages.** An einem E-Tag sind projektübergreifend keine
  Projektstunden, keine sonstigen Arbeitszeiten und keine Fehlzeiten (U/K/S)
  erfassbar. In allen betroffenen Zeilen wird kein Eingabefeld gerendert.
- **Ein Code pro Tag.** E schließt U/K/S am selben Tag aus.
- **Arbeitszeitgrenzen.** Unverändert. Da an E-Tagen null Stunden erfasst
  werden, entsteht keine Fehlaussage.
- **Feiertage.** An einem E-Tag unterbleibt die Feiertags-Vorbelegung der
  S-Zeile — ohne Entgeltfortzahlung gibt es keine bezahlten Feiertagsstunden.
  Deshalb wird E auch AUF Feiertage geschrieben (§6.2).

### 5.2 Wochenenden

Bleiben frei; für sie entsteht keine E-Zeile.

### 5.3 Fallstrick: der Monats-Abgleich beim Speichern (gelöst)

`TimesheetForm` synchronisiert beim Speichern die Abwesenheiten des angezeigten
Monats gegen `v7_employee_absences` und deaktivierte dabei **jede** aktive Zeile
des Monats, die nicht im Soll-Stand steht. Der Soll-Stand kennt nur U/K/S — ein
E-Zeitraum wäre beim nächsten Speichern still verschwunden.

**Gelöst in v7.4.6-89:** Die Ist-Abfrage des Abgleichs filtert auf
`absence_code IN ('U','K','S')`. E-Zeilen werden dort weder gelesen noch
verändert; sie werden ausschließlich über den Bereichsdialog verwaltet.

---

## 6. Erfassung: Bereichsdialog

### 6.1 Auslöser

Zwei Wege, beide öffnen denselben Dialog:

- **Rechtsklick** auf eine Tageszelle → „Elternzeit (Zeitraum) ..." bzw. an
  einem E-Tag → „Elternzeit-Zeitraum entfernen ...".
- Eingabe von **E** in einer AP-Tageszelle.

Eine Einzeltag-Erfassung gibt es bewusst nicht.

### 6.2 Umfang des Zeitraums

Geschrieben werden alle Tage **Montag bis Freitag, Feiertage eingeschlossen**.
Wochenenden bleiben frei. Der Feiertag muss mit erfasst werden, weil sonst die
Feiertags-Vorbelegung der S-Zeile dort wieder bezahlte Stunden erzeugt
(Entscheidung Martin, 08.09.2026).

### 6.3 Vorschau vor dem Schreiben

Der Dialog zeigt nach „Zeitraum pruefen":

- Zahl der Tage, die mit E belegt werden
- bereits als Elternzeit erfasste Tage im Zeitraum
- zu ersetzende Fehlzeiten (U/K/S) mit Auswahlhaken
- Tage mit erfassten Arbeitsstunden (werden nicht überschrieben)
- abgeschlossene Monate (werden übersprungen)

**Nicht geprüft** (Stand V7.9.10): im Zeitraum verplante Arbeitsplan-PM und das
Projektende. Siehe §10 und §11.

### 6.4 Konfliktbehandlung

**Abwesenheiten (U/K/S) im Zeitraum → werden ersetzt (Voreinstellung: ja).**
Ein Urlaubstag, der in eine später festgelegte Elternzeit fällt, ist kein
Urlaubstag mehr; der Anspruch wandert nach §17 BEEG hinter die Elternzeit.
Abwählbar für den Fall eines falschen Startdatums.

**Erfasste Projektstunden im Zeitraum → werden NICHT überschrieben.**
Entweder ist das Datum falsch, oder der MA hat tatsächlich gearbeitet — und
Arbeit während der Elternzeit ist der Teilzeitfall nach §2.1, nicht E. Der
Dialog listet die Tage und fordert zur Prüfung des Startdatums auf.

**Hintergrund dieser Prüfung:** Sie ist nicht für ein plausibles Szenario
gedacht, sondern als Detektor für Eingabefehler — vertipptes Startdatum,
falsches Jahr im Bis-Feld. Ohne sie würde ein Bereichsschreiber über hunderte
Tage still einen bereits erfassten Zeitraum leerräumen. Der Praxisfall trat am
08.09.2026 sofort ein (Flensburger Yacht-Service, April 2026): Der Dialog meldete
14 Tage mit erfassten Arbeitsstunden und verhinderte deren Verlust.

**Abgeschlossene Monate** im Zeitraum werden übersprungen. Der Ablauf für einen
solchen Fall lautet: Monatsabschluss aufheben, Stunden bereinigen und speichern,
Elternzeit eintragen, Monat wieder abschließen.

### 6.5 Rücknahme

Derselbe Dialog bietet an einem E-Tag „Elternzeit-Zeitraum entfernen" (von–bis).
Ersetzte U/K/S-Tage werden dabei **nicht** wiederhergestellt; der Dialog weist
darauf hin.

Ein „Ändern" gibt es bewusst nicht: Verlängern = erneut eintragen, Verkürzen =
das überzählige Stück entfernen.

**Einschränkung (festgestellt 11.09.2026, A-066):** Der Menüpunkt erscheint nur an
einem E-Tag. Liegt der gesamte E-Zeitraum in Monaten, die das Projekt nicht
anzeigt (außerhalb der Projektlaufzeit), ist die Rücknahme über die Oberfläche
nicht erreichbar. Behelf: `is_active = false` per SQL.

### 6.6 Berechtigung

E darf nur von **Berater oder Firmen-Administrator** gesetzt oder entfernt
werden (`portal === 'berater' || isAdmin`) — im Unterschied zu U/K/S, die der
Mitarbeiter selbst erfasst.

---

## 7. Anzeige und Nachweis

- Eigene Zeile „Elternzeit (E, keine Arbeitszeit)" im Abschnitt Fehlzeiten,
  sichtbar nur wenn E-Tage vorhanden sind. Statt einer Stundensumme steht die
  Zahl der Tage („22 Tg.").
- Identisch im Bildschirmformular, im Einzeldruck und im Sammeldruck.
- Der Code steht ausschließlich für Elternzeit. Andere ruhende
  Arbeitsverhältnisse (unbezahlter Urlaub, Sabbatical) erhalten bei Bedarf einen
  eigenen Code; E wird nicht generisch umgedeutet.

**Hinweis zur Zählweise:** Das Formular zählt E-Tage Mo–Fr einschließlich
Feiertagen („16 Tg."), die Kapazitätsplanung zählt nur Arbeitstage („14
Arbeitstage"). Beide Zahlen sind richtig; sie beantworten verschiedene Fragen.

---

## 8. Betroffene Komponenten (Stand nach Umsetzung)

| Komponente | Änderung | Build |
|------------|----------|-------|
| SQL / Supabase | CHECK-Constraint um `'E'` erweitert, DEV **und** PROD | 08.09.2026 |
| `TimesheetForm` | E vom Monats-Abgleich ausgenommen | v7.4.6-89 |
| `TimesheetForm` | E laden, anzeigen, Tagessperre, keine Feiertagsstunden | v7.4.6-90 |
| `TimesheetForm` | an E-Tagen auch keine U/K/S erfassbar | v7.4.6-91 |
| `TimesheetForm` | Bereichsdialog erfassen/entfernen, Berechtigung | v7.4.6-92 |
| `TimesheetForm` | Rechtsklick auf gesperrten Zellen (pointer-events) | v7.4.6-93 |
| `stundennachweisSheetData` | E als Tag-Marker, keine Feiertagsstunden | v1.0.2 |
| `StundennachweisSheet` | E-Zeile im Sammeldruck | v1.0.4 |
| `berater/multiprojekt/page.tsx` (Kapazitätsplanung) | E-Arbeitstage mindern die Monatskapazität, Zelle „E", Tooltip, Legende | v7.4.8-28 / -29 (V7.9.10) |
| `lib/employeeAbsences.ts` | unverändert — reicht alle Codes durch | — |
| `BerichtePage` / ZA | unverändert — E trägt 0 Stunden, keine Wirkung | — |
| `berater/multiprojekt/[id]/page.tsx` (FZul-Detail) | E (und U/K/S) an Arbeitstagen: keine FZul-Stunden in Übersicht, Import, Kalender (hellblaue Zelle „E"), Export; E-Arbeitstage an die Export-Route | v7.4.8-18 bis -20 (V7.9.11) |
| `api/export/fzul/route.ts` (BSFZ-Excel) | E-Arbeitstage in Zeile 43 „Kurzarbeit, Erziehungsurlaub u. ä." (O43) | v2.5 (V7.9.11) |

---

## 9. Getestet

**DEV, 08.09.2026 (Testdaten anschließend deaktiviert):**

- E-Zeitraum per SQL angelegt → Anzeige im Formular korrekt (22 Tg.)
- Speichern des Monats → E-Zeilen bleiben erhalten (Schutz aus -89 wirkt)
- Fehlzeiten U/K/S an E-Tagen nicht mehr eingebbar
- Sammeldruck zeigt die E-Zeile
- Bereichsdialog: 02.11.–20.11.2026 → 15 Tage korrekt eingetragen
- Rücknahme 04.11.–06.11.2026 → 12 Tage verbleiben

**Echtfall (Flensburger Yacht-Service, SmartMarina, April 2026):**

- Kollision mit bereits erfassten Projektstunden wurde gemeldet, nichts
  überschrieben
- nach Aufheben des Monatsabschlusses, Bereinigen der Stunden und erneutem
  Eintragen: 16 E-Tage vom 01.–22.04., inklusive Karfreitag und Ostermontag
- „Sonstige bezahlte Ausfallzeiten" = 0,00 — die Feiertagsregel greift in der
  Praxis
- Projektstunden ab dem 23.04. blieben unberührt
- zweiter Zeitraum desselben MA: 23.07.–21.08.2026 (bestätigt 11.09.2026)

**Kapazitätsplanung, 11.09.2026:** siehe §12.3.

---

## 10. Nicht-Ziele

- Keine eigene Zeitraum-Entität für ruhende Arbeitsverhältnisse (§3).
- Keine Abbildung von Mutterschutz als eigener Code in dieser Stufe.
- Keine automatische Anpassung der Arbeitsplan-PM, wenn ein MA über Monate
  ausfällt. Eine Warnung bei verplanten PM im E-Zeitraum wäre der logische
  nächste Schritt. **Stand V7.9.10:** Die Kapazitätsplanung macht den Fall
  sichtbar (rotes „E"), der Erfassungsdialog warnt noch nicht.
- Keine Änderung an pWAZ, Stundensatz oder Wochenstunden-Historie durch E.

---

## 11. Umsetzungsstand

**Abgeschlossen am 08.09.2026**, deployed auf Produktion (Vercel), Schema in DEV
und PROD identisch. SW-Release V7.9.7, `main` = `17d2bfe` auf beiden Remotes.

**Dokumentiert am 09.09.2026:**

- PFLICHTENHEFT-v5_40-AENDERUNGSBLOCK.md — neuer §7f „Elternzeit im
  Stundennachweis (Code E)", Komponenten in §4.1, Anforderung A-059,
  Änderungshistorie v5.40
- GIT-SICHERUNG-v7_9_7-session81.md — Weg zur Lösung, Builds, Verifikation

**Kapazitätsplanung am 11.09.2026** (V7.9.10, `main` = `ec2b101`, Tag `v7.9.10`):

- PFLICHTENHEFT-v5_43-AENDERUNGSBLOCK.md — A-065 (erledigt), A-066 und A-067 (offen)
- GIT-SICHERUNG-v7_9_10-session82.md

**FZul-Detailseite und BSFZ-Export am 11.09.2026** (V7.9.11, `main` = `b4f8e42`,
Tag `v7.9.11`):

- PFLICHTENHEFT-v5_44-AENDERUNGSBLOCK.md — A-067 (erledigt), A-068 und A-069 (neu,
  erledigt)
- GIT-SICHERUNG-v7_9_11-session83.md

**Offene Punkte (Stand 11.09.2026, nach V7.9.11):**

- ~~Kapazitätsplanung berücksichtigt E-Tage nicht~~ — **erledigt in V7.9.10.**
- ~~FZul-Detailseite liest `v7_employee_absences` nicht (A-067)~~ — **erledigt in
  V7.9.11**, siehe §13.
- Warnung in der Vorschau des Dialogs, wenn im E-Zeitraum noch Arbeitsplan-PM für
  den MA verplant sind.
- Rücknahme eines E-Zeitraums außerhalb der Projektlaufzeit über die Oberfläche
  (A-066, §6.5).
- Anleitungen (Admin, PL) noch nicht aktualisiert.

---

## 12. Kapazitätsplanung (ab V7.9.10)

### 12.1 Rechenregel

```
Arbeitstage        = countWorkdaysInMonth(jahr, monat, bundesland)   [Mo-Fr ohne Feiertage]
E-Arbeitstage      = E-Tage des MA im Monat, die Mo-Fr UND kein Feiertag sind
Monatskapazität    = (Arbeitstage - E-Arbeitstage) x (WAZ / 5)
Frei               = max(0, Monatskapazität - geplant - verbucht)
Ampel-Prozent      = Frei / (Arbeitstage x WAZ / 5)                   [volle Kapazität]
```

Feiertage fallen aus den E-Tagen heraus, weil der Dialog E auch auf Feiertage
schreibt (§6.2), `countWorkdaysInMonth` sie aber nicht zählt. Ohne diese Regel würde
ein Feiertag doppelt abgezogen.

### 12.2 Anzeige

- **Teilweise Elternzeit:** Zahl und Ampel wie gewohnt; die Ampel misst gegen die
  volle Monatskapazität (Entscheidung Martin, 11.09.2026). Beispiel: 48 h frei von
  160 h = 30 %, gelb.
- **Monat vollständig in Elternzeit:** hellblaue Zelle „E" statt Ampel. Rote Schrift,
  wenn im Monat trotzdem Stunden geplant oder verbucht sind (praktisch: verplante
  Arbeitsplan-PM, §10).
- **Tooltip:** Monatskapazität (voll), „Elternzeit (E), n Arbeitstage: −x h",
  „Verfügbar", bei rotem E eine Warnzeile.
- **Jahressummen** „Frei h" und „Frei PM" folgen den Monatswerten.

### 12.3 Verifiziert (11.09.2026)

- **DEV (AS System):** Teil-E-Monat 80 h / 45 %, Voll-E-Monat „E", Jahressummen
  1520 → 1248 h und 8,77 → 7,20 PM; rotes E bei 260 h Planung; Rücknahme per Dialog
  und per SQL, Werte danach wieder im Ausgangszustand.
- **PROD (Flensburger Yacht-Service, April 2026):** 160 h Monatskapazität,
  14 E-Arbeitstage (16 E-Tage abzüglich Karfreitag und Ostermontag), −112 h,
  verfügbar 48 h, verbucht 48 h.
- **PROD, zweiter Zeitraum 23.07.–21.08.2026** (von Martin als korrekt bestätigt):
  Juli 7 E-Arbeitstage, verfügbar und verbucht je 128 h; August 15 E-Arbeitstage
  (−120 h), verfügbar und verbucht je 48 h.
- In allen drei Monaten decken sich verfügbar und verbucht auf die Stunde.

---

## 13. FZul-Detailseite und BSFZ-Export (ab V7.9.11)

### 13.1 Regeln

- E-Tage (wie U/K/S) werden **mitarbeiterbezogen** aus `v7_employee_absences` gelesen,
  ohne Filter auf das Projekt-Zuordnungsfenster — die Forschungszulage hängt an der
  Person, nicht an einem Projekt.
- Wirksam nur an **Arbeitstagen** (Mo–Fr, kein Feiertag). E auf Feiertagen (§6.2) zählt
  nicht; dort gilt der Feiertag.
- **Übersicht:** Max./Verf. h minus E-Arbeitstage × Tagesarbeitszeit.
- **Import:** an E-Tagen `fue_hours = verfuegbar_hours = 0`; keine Stunden in
  `urlaub_/krank_/sonderurlaub_hours` (es gibt keine E-Spalte).
- **Jahreskalender:** hellblaue Zelle „E" ohne Eingabefeld. Sind an einem E-Tag noch
  FZul-Stunden gespeichert (Import vor dem Eintragen der Elternzeit), ist die Zelle rot,
  ein Hinweis nennt Anzahl und Stunden; Korrektur manuell (Wert 0, Monat speichern) oder
  per „Neu importieren". Keine automatische DB-Änderung.
- **BSFZ-Excel:** Tagesraster an E-Tagen leer; E-Arbeitstage in Zeile 43 „Kurzarbeit,
  Erziehungsurlaub u. ä." (Fußnote 7 der Vorlage: „Das gilt auch für Kurzarbeit,
  Elternzeit u. ä."). Die Stunden rechnet die Vorlage (Tage × Wochenarbeitszeit / 5).

### 13.2 Verifiziert (11.09.2026)

- **DEV (AS System, Bohlmann, E 14.–31.12.2026):** Vorschau 14 Tage; im Kalender
  13 E-Arbeitstage (25.12. bleibt 1. Weihnachtstag). Vor dem Neu-Import roter Hinweis
  „13 Abwesenheitstage mit gespeicherten FZul-Stunden (104.0 h)", danach hellblau,
  Dezember 72 h. BSFZ-Excel: Dezember-Raster an E-Tagen leer, Zeile 43 = 13 Tage /
  104 h, maßgebliche Jahresarbeitszeit 1.648 h.
- Testzeitraum anschließend wieder entfernt (von Martin bestätigt).
