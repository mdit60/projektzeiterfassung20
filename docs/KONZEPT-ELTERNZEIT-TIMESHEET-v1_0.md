# KONZEPT: Elternzeit in der Stundenerfassung (Abwesenheitscode E)

**Version:** 1.0
**Datum:** 08.09.2026 (§11 am 09.09.2026 fortgeschrieben)
**Status:** UMGESETZT und in Produktion (siehe §11 Umsetzungsstand)
**Betrifft:** PZE V7, `TimesheetForm` und Lesepfade des Stundennachweises
**Verwandte Konzepte:** KONZEPT-ABWESENHEITEN-ZENTRAL-v1_1.md,
KONZEPT-ARBEITSZEITGRENZEN-v1_4.md

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
**E** und null Stunden.

### 1.1 Bestätigung durch den Projektträger (VDI, Telefonat 08.09.2026)

Aussage des Projektträgers: Für den Nachweis genügt es, an den betroffenen Tagen
bzw. Wochen **nichts einzutragen**; eine Kennzeichnung als Elternzeit — etwa durch
ein „E" — ist willkommen, aber nicht gefordert.

---

## 2. Abgrenzung: zwei Sachverhalte

### 2.1 Teilzeit während der Elternzeit — kein neues Feature

Das BEEG erlaubt Arbeit bis 32 h/Woche während der Elternzeit. Abgedeckt über einen
neuen Eintrag in der Wochenstunden-Historie (`v7_employee_hours_history`), gültig ab
dem Monatsersten, Notiz „Elternzeit". Die pWAZ des Projekts und damit der bewilligte
Stundensatz bleiben unverändert (KONZEPT-ARBEITSZEITGRENZEN-v1_4.md §2.4).

**Wichtig:** Der Code E ist für diesen Fall NICHT vorgesehen.

### 2.2 Vollständige Elternzeit ohne Arbeit — Code E

Nur hierfür wurde der Abwesenheitscode E eingeführt.

---

## 3. Verworfene Alternative

Diskutiert wurde eine eigene, zeitraumbasierte Tabelle `v7_employee_leave_periods`
(leave_type, start_date, end_date, weekly_hours_during) mit daraus abgeleiteter
Sperre. **Verworfen wegen Aufwand-Nutzen** — sie hätte eine zweite Zustandsebene mit
eigener UI, Sperrlogik und Lesepfaden eingeführt. Für die Projektabrechnung ist
allein relevant, dass an diesen Tagen keine Stunden anfielen; die Auskunft des
Projektträgers (§1.1) bestätigt das.

**Bewusst in Kauf genommen:** Die Sperre wirkt tagesweise und entsteht durch
Erfassung. Wird ein Zeitraum nicht eingetragen, ist er auch nicht gesperrt.

**Nicht verloren:** Die E-Tage liegen in `v7_employee_absences` und sind damit auch
für die Kapazitätsplanung auswertbar.

---

## 4. Datenmodell

Keine neue Tabelle.

```sql
-- Vorher:  CHECK (absence_code IN ('U','K','S'))
-- Jetzt:   CHECK (absence_code IN ('U','K','S','E'))
```

Constraint-Name in beiden Umgebungen: `v7_employee_absences_absence_code_check`.
Migrationsskript: `SQL-MIGRATION-absence-code-E-dev-v1.sql` (ermittelt den Namen
selbst per DO-Block, daher auch auf PROD unverändert einsetzbar).

| Spalte | Wert |
|--------|------|
| `absence_code` | `'E'` |
| `hours` | `0` |
| `work_date` | der Kalendertag |
| `note` | `'Elternzeit'` |

Kein `project_id` → ein E-Tag gilt in allen Projekten des MA, sofern das
Zuordnungsfenster den Tag einschließt.

---

## 5. Verhalten

### 5.1 Wirkung eines E-Tages

- **Null Stunden**, fließt in keine Summe ein.
- **Ganztägige Sperre:** keine Projektstunden, keine sonstigen Arbeitszeiten, keine
  Fehlzeiten U/K/S.
- **Ein Code pro Tag.**
- **Arbeitszeitgrenzen** unverändert.
- **Feiertage:** keine Feiertags-Vorbelegung der S-Zeile — ohne Entgeltfortzahlung
  keine bezahlten Feiertagsstunden. Deshalb wird E auch AUF Feiertage geschrieben.

### 5.2 Wochenenden

Bleiben frei; für sie entsteht keine E-Zeile.

### 5.3 Fallstrick: der Monats-Abgleich beim Speichern (gelöst)

`TimesheetForm` deaktivierte beim Speichern jede aktive Abwesenheitszeile des
Monats, die nicht im Soll-Stand steht; der Soll-Stand kennt nur U/K/S. **Gelöst in
v7.4.6-89:** Die Ist-Abfrage filtert auf `absence_code IN ('U','K','S')`.

---

## 6. Erfassung: Bereichsdialog

### 6.1 Auslöser

Rechtsklick auf eine Tageszelle („Elternzeit (Zeitraum) ..." bzw. an einem E-Tag
„Elternzeit-Zeitraum entfernen ...") oder Eingabe von **E** in einer AP-Tageszelle.
Eine Einzeltag-Erfassung gibt es bewusst nicht.

### 6.2 Umfang des Zeitraums

Alle Tage **Montag bis Freitag, Feiertage eingeschlossen**. Wochenenden bleiben
frei. Der Feiertag muss mit erfasst werden, weil sonst die Feiertags-Vorbelegung
der S-Zeile dort wieder bezahlte Stunden erzeugt.

### 6.3 Vorschau vor dem Schreiben

Zahl der zu belegenden Tage, bereits erfasste E-Tage, zu ersetzende U/K/S,
Tage mit erfassten Arbeitsstunden, abgeschlossene Monate.

### 6.4 Konfliktbehandlung

**U/K/S im Zeitraum → werden ersetzt (Voreinstellung).** Ein Urlaubstag, der in eine
später festgelegte Elternzeit fällt, ist kein Urlaubstag mehr; der Anspruch wandert
nach §17 BEEG hinter die Elternzeit.

**Erfasste Projektstunden → werden NICHT überschrieben.** Entweder ist das Datum
falsch, oder der MA hat gearbeitet — dann ist es der Teilzeitfall nach §2.1.

**Hintergrund:** Detektor für Eingabefehler (vertipptes Startdatum, falsches Jahr).
Der Praxisfall trat am 08.09.2026 sofort ein (Flensburger Yacht-Service, April
2026): 14 Tage mit erfassten Arbeitsstunden wurden gemeldet und blieben unberührt.

**Abgeschlossene Monate** werden übersprungen. Ablauf: Monatsabschluss aufheben,
Stunden bereinigen und speichern, Elternzeit eintragen, Monat wieder abschließen.

### 6.5 Rücknahme

„Elternzeit-Zeitraum entfernen" (von–bis) im selben Dialog. Ersetzte U/K/S-Tage
werden **nicht** wiederhergestellt. Ein „Ändern" gibt es nicht: Verlängern = erneut
eintragen, Verkürzen = überzähliges Stück entfernen.

### 6.6 Berechtigung

Nur **Berater oder Firmen-Administrator** (`portal === 'berater' || isAdmin`).

---

## 7. Anzeige und Nachweis

Eigene Zeile „Elternzeit (E, keine Arbeitszeit)" im Abschnitt Fehlzeiten, nur
sichtbar wenn E-Tage vorhanden sind; statt Stundensumme die Zahl der Tage.
Identisch im Formular, Einzeldruck und Sammeldruck. Der Code steht ausschließlich
für Elternzeit.

---

## 8. Betroffene Komponenten

| Komponente | Änderung | Build |
|------------|----------|-------|
| SQL / Supabase | CHECK-Constraint um `'E'` erweitert, DEV und PROD | 08.09.2026 |
| `TimesheetForm` | E vom Monats-Abgleich ausgenommen | v7.4.6-89 |
| `TimesheetForm` | E laden, anzeigen, Tagessperre, keine Feiertagsstunden | v7.4.6-90 |
| `TimesheetForm` | an E-Tagen auch keine U/K/S erfassbar | v7.4.6-91 |
| `TimesheetForm` | Bereichsdialog erfassen/entfernen, Berechtigung | v7.4.6-92 |
| `TimesheetForm` | Rechtsklick auf gesperrten Zellen (pointer-events) | v7.4.6-93 |
| `stundennachweisSheetData` | E als Tag-Marker, keine Feiertagsstunden | v1.0.2 |
| `StundennachweisSheet` | E-Zeile im Sammeldruck | v1.0.4 |
| `lib/employeeAbsences.ts` | unverändert — reicht alle Codes durch | — |
| `BerichtePage` / ZA | unverändert — E trägt 0 Stunden | — |

---

## 9. Getestet

**DEV, 08.09.2026 (Testdaten anschließend deaktiviert):** Anzeige 22 Tg.; Speichern
erhält E; U/K/S an E-Tagen gesperrt; Sammeldruck zeigt die E-Zeile; Bereichsdialog
02.11.–20.11.2026 → 15 Tage; Rücknahme 04.–06.11. → 12 Tage.

**Echtfall (Flensburger Yacht-Service, SmartMarina, April 2026):** Kollision
gemeldet, nichts überschrieben; nach Bereinigung 16 E-Tage vom 01.–22.04. inklusive
Karfreitag und Ostermontag; „Sonstige bezahlte Ausfallzeiten" = 0,00;
Projektstunden ab dem 23.04. unberührt.

---

## 10. Nicht-Ziele

- Keine eigene Zeitraum-Entität für ruhende Arbeitsverhältnisse (§3).
- Kein eigener Code für Mutterschutz in dieser Stufe.
- Keine automatische Anpassung der Arbeitsplan-PM.
- Keine Änderung an pWAZ, Stundensatz oder Wochenstunden-Historie durch E.

---

## 11. Umsetzungsstand

**Abgeschlossen am 08.09.2026**, deployed auf Produktion, Schema in DEV und PROD
identisch. SW-Release V7.9.7, `main` = `17d2bfe` auf beiden Remotes, Tag `v7.9.7`.

**Dokumentiert am 09.09.2026:** PFLICHTENHEFT-v5_40-AENDERUNGSBLOCK.md (neuer §7f,
A-059, §12e/Verhaltensvertrag), GIT-SICHERUNG-v7_9_7-session81.md,
VERHALTENSVERTRAG-v1_2.md (TF-15).

**Offene, bewusst zurückgestellte Punkte:**

- Kapazitätsplanung (`/v7/berater/multiprojekt`) berücksichtigt E-Tage noch nicht.
- Warnung, wenn im E-Zeitraum noch Arbeitsplan-PM verplant sind.
- Anleitungen (Admin, PL) noch nicht aktualisiert.
