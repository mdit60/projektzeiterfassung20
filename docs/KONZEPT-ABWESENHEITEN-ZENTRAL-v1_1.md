# KONZEPT: Projektübergreifende Abwesenheiten (zentrale Abwesenheits-Tabelle)

**Version:** 1.1 (final, nach Klärung)
**Datum:** 22.06.2026
**Status:** Abgenommen, bereit zur Umsetzung
**Betrifft:** PZE V7, ausgelöst durch erste Firma mit zwei parallelen Projekten
(Selaflex GmbH: InGrav + GRAVID, MA Linfert in beiden aktiv)

---

## Änderungen gegenüber v1.0 (Entscheidungen Martin)

- **§6 Förderrecht bestätigt:** Abwesenheiten sind mitarbeiterbezogen und gelten
  in allen Projekten des MA.
- **§9.1 Teilabwesenheiten gestrichen:** Ein Tag ist entweder Abwesenheit *oder*
  Arbeit. Keine Mischformen (kein „4h Urlaub + 4h Arbeit").
- **§9.4 bestätigt:** Genau ein Code pro Tag (entspricht der bestehenden
  Ein-Code-Regel im TimesheetForm).
- **§5 präzisiert:** Der 9h-Tagesdeckel gilt für die Summe der **Arbeitsstunden**
  über alle Projekte — nicht für Arbeit+Abwesenheit kombiniert (entfällt durch
  Ein-Code-Regel). Arbeitsstunden dürfen über mehrere Projekte verteilt werden;
  Empfehlung: pro Tag nur ein Projekt (sauberere Abrechnung).
- **§9.6 bestätigt:** Feiertage bleiben außen vor (regionsabhängig berechnet).

---

## 1. Ziel & Motivation

Eine Abwesenheit (Urlaub, Krankheit, Sonstiges) ist eine Eigenschaft der
**Person an einem Kalendertag**, nicht eines Projekts. Wer Urlaub hat, hat
Urlaub — unabhängig davon, an wie vielen Projekten er arbeitet.

Heute werden Abwesenheiten projektgebunden gespeichert (als Zeilen in
`v7_timesheets` mit `absence_code` und `project_id`). Bei einer Firma mit
mehreren parallelen Projekten und einem MA in mehreren Teams führt das zu drei
Problemen:

1. **Doppelerfassung:** Der Urlaubstag muss in jedem Projekt einzeln eingetragen
   werden.
2. **Inkonsistenz:** Die Projekte können auseinanderlaufen (Urlaub in Projekt A
   eingetragen, in Projekt B vergessen).
3. **Lückenhafte Sperre:** Die projektinterne Regel „wer abwesend ist, bucht
   keine Arbeit" greift heute nur innerhalb eines Projekts; projektübergreifend
   schützt bisher nur der 9h-Tagesdeckel.

**Zielzustand:** Eine Abwesenheit wird **einmal** erfasst und gilt automatisch
in allen Projekten, an denen der MA im betreffenden Zeitraum aktiv ist. Ändern
oder Zurücknehmen wirkt überall.

---

## 2. Grundprinzip

- Genau **eine** aktive Abwesenheit je (Mitarbeiter, Kalendertag).
- Codes: **U** (Urlaub), **K** (Krank), **S** (Sonstige Abwesenheit). Feiertage
  (F) bleiben außen vor — die werden weiterhin regionsabhängig berechnet, nicht
  erfasst.
- **Ein Code pro Tag:** Ein Tag ist entweder ein Abwesenheitstag (ein Code, voll)
  oder ein Arbeitstag. Keine Teilabwesenheiten, keine Mischung Abwesenheit+Arbeit.
- Stunden je Abwesenheitstag = Tagesstunden des MA (voll).
- An einem Arbeitstag dürfen die Arbeitsstunden über mehrere Projekte verteilt
  werden (Summe ≤ 9h, §5); empfohlen ist jedoch ein Projekt pro Tag.
- Geltungsbereich: Eine Abwesenheit wirkt in einem Projekt nur, wenn das
  Zuordnungsfenster des MA (`assignment_start`/`assignment_end`) diesen Tag
  abdeckt. Außerhalb des Fensters erscheint sie dort nicht.

---

## 3. Datenmodell

**Neue Tabelle `v7_employee_absences`:**

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| id | uuid (PK) | |
| employee_id | uuid (NOT NULL) | -> v7_employees |
| client_company_id | uuid (NOT NULL) | redundant fuer schnelle Filterung/RLS |
| work_date | date (NOT NULL) | der Kalendertag |
| absence_code | text/enum (NOT NULL) | 'U' / 'K' / 'S' |
| hours | numeric (NOT NULL) | Tagesstunden (oder Teil) |
| note | text (NULL) | optional |
| entered_by | uuid (NULL) | |
| entered_at | timestamptz | |
| is_active | boolean (default true) | |
| created_at / updated_at | timestamptz | |

**Eindeutigkeit:** partieller UNIQUE-Index auf (`employee_id`, `work_date`) nur
für `is_active = true` — analog zur „Stufe 2"-Logik bei den Timesheets (kein
Doppeleintrag, Historie via is_active=false bleibt möglich).

**Abgrenzung zu `v7_timesheets`:** Nach der Migration enthält `v7_timesheets`
nur noch **Projektarbeit** (AP-Zeilen) und nicht-zuschussfähige Projektarbeit.
Die Abwesenheits-Zeilen wandern komplett in `v7_employee_absences`.

---

## 4. Verhalten

### 4.1 Eingabe
In jedem Projekt-Stundennachweis schreibt die Eingabe von U/K/S auf einen Tag in
`v7_employee_absences` (employee + date), nicht mehr in die Projektzeile.

### 4.2 Anzeige / Laden
Beim Öffnen eines beliebigen Projekt-Stundennachweises werden die Abwesenheiten
des MA für den Monat aus `v7_employee_absences` geladen und in den
Abwesenheitszeilen angezeigt — in allen Projekten identisch.

### 4.3 Ändern / Zurücknehmen
Bearbeiten oder Löschen ändert die **eine** Zeile -> sofort in allen Projekten
wirksam (z.B. „Urlaub doch nicht genommen" entfernt ihn überall).

### 4.4 Geltungsbereich (Überlappung)
Eine Abwesenheit wird einem Projekt nur zugerechnet, wenn das
Zuordnungsfenster des MA für dieses Projekt den Tag einschließt (§2).

---

## 5. Validierung (Zusammenspiel mit den Arbeitszeitgrenzen)

- **Ein Code pro Tag:** Ein Tag ist entweder Abwesenheit oder Arbeit. Dadurch
  entsteht die Kombination „Arbeit + Abwesenheit am selben Tag" gar nicht erst.
- **Abwesenheitstag sperrt Arbeit projektübergreifend (hart):** Liegt für einen
  Tag eine Abwesenheit (U/K/S) vor, ist an diesem Tag in **allen** Projekten
  keine Arbeitsbuchung möglich.
- **9h-Tagesdeckel = Summe der Arbeitsstunden über alle Projekte** (nicht
  Arbeit+Abwesenheit). Da Abwesenheiten künftig nicht mehr in `v7_timesheets`
  liegen, summiert der Cross-Projekt-Lader automatisch nur noch Arbeitsstunden.
- Arbeitsstunden eines Tages dürfen über mehrere Projekte verteilt werden
  (Summe ≤ 9h). Empfehlung: pro Tag nur ein Projekt (sauberere Abrechnung) — als
  Empfehlung, nicht als harte Sperre.

---

## 6. Stundennachweis / Förderrecht (BESTÄTIGT)

Mit personenbezogener Abwesenheit erscheint derselbe Abwesenheitstag auf
**jedem** Projekt-Stundennachweis des MA, an dem er im Zeitraum aktiv ist. Die
projektbezogenen Arbeitsstunden bleiben unberührt. **Bestätigt durch Martin:**
Abwesenheiten sind mitarbeiterbezogen und gelten projektübergreifend — die
konsistente Anwesenheitsdarstellung der Person ist gewünscht und korrekt.

---

## 7. Migration (DEV zuerst, dann PROD)

1. Tabelle `v7_employee_absences` + partiellen UNIQUE-Index anlegen. RLS analog
   den übrigen v7-Tabellen.
2. Bestand übernehmen: je (employee_id, work_date) mit Abwesenheit in
   `v7_timesheets` **eine** Zeile in `v7_employee_absences` erzeugen.
   - Backup-Tabelle vor jeder Schreiboperation.
   - Konfliktfall (unterschiedliche Codes für denselben Tag in verschiedenen
     Projekten) -> Liste zur manuellen Klärung, nicht automatisch raten.
3. Migrierte Abwesenheits-Zeilen in `v7_timesheets` deaktivieren
   (`is_active=false`), nicht löschen (Rückweg).
4. Verifikation: Summenabgleich je MA/Monat vor/nach Migration.

---

## 8. Betroffene Komponenten

- **TimesheetForm** — Laden, Speichern, Validieren der Abwesenheiten (gehärtet,
  Verhaltensvertrag -> besonders vorsichtig, schrittweise).
- **StundennachweisMatrix**, **StundennachweisSheet**, **stundennachweisSheetData**
  — Abwesenheiten aus der neuen Tabelle lesen.
- **BerichtePage** — sofern Abwesenheiten dargestellt werden.
- Cross-Projekt-Lader (otherProjectHours) — Quelle anpassen.

---

## 9. Geklärte Entscheidungen & verbleibende Detailpunkte

**Geklärt:**
1. **Teilabwesenheit:** NEIN. Ein Tag ist entweder Abwesenheit oder Arbeit (kein
   „4h Urlaub + 4h Arbeit").
2. **Genau ein Code pro Tag:** JA (bestehende Ein-Code-Regel im TimesheetForm).
3. **Feiertage (F):** bleiben berechnet, nicht in der Tabelle.
4. **9h-Deckel:** Summe der Arbeitsstunden über alle Projekte (nicht
   Arbeit+Abwesenheit). Arbeit darf über Projekte verteilt werden, Empfehlung
   ein Projekt pro Tag.

**Bei der Migration noch operativ zu behandeln (kein Konzept-Offenpunkt):**
- **Code-Konflikte:** Falls im Bestand für denselben (MA, Tag) in verschiedenen
  Projekten unterschiedliche Codes stehen -> Klärungsliste, nicht automatisch
  raten.
- **Importierte Timesheets** (data_source='import') mit Abwesenheiten: in die
  Migration einbeziehen, gleiche Konfliktbehandlung.
- **RLS** der neuen Tabelle: Lese-/Schreibrechte je Portal/Rolle analog den
  übrigen v7-Tabellen.

---

## 10. Vorgeschlagene Reihenfolge

1. **Teil 2a (separat, läuft schon):** MA-Auswahl im TimesheetForm aufs
   Projektteam filtern. Unabhängig von diesem Konzept.
2. Tabelle + Migration auf DEV anlegen und prüfen.
3. Lesepfade umstellen (Matrix/Sheet/Reports lesen aus der neuen Tabelle).
4. Schreibpfad im TimesheetForm umstellen + harte Cross-Projekt-Abwesenheitssperre.
5. Tests (auch Verhaltensvertrag-Checks), dann PROD-Migration + Deploy.

---

## 11. Status

Alle Abstimmungspunkte (§6, §9.1, §9.4, §9.6, §5-Präzisierung) sind geklärt.
Konzept ist final (v1.1) und zur Umsetzung gemäß §10 freigegeben. Nächster
konkreter Schritt: Tabelle `v7_employee_absences` + partieller UNIQUE-Index +
Datenmigration auf DEV (mit Backup-Tabelle und Konflikt-Klärungsliste), danach
Verifikation, dann erst die Code-Umstellung der Lese-/Schreibpfade.
