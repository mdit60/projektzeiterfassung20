# GIT-SICHERUNG - Session 26 (v7.4.6-4)

**Datum:** 22. April 2026
**SW-Release:** V7.4.6-4
**Pflichtenheft:** v4.71

---

## Session-Zusammenfassung

Session 26 hat den AP-Auswahl-Flow in der Zeiterfassung verbessert, nachdem
der Kunde AS System am 21.04.2026 beim Einrichtungstermin auf zwei Probleme
gestossen ist:

1. AP-Ueberschriften ohne Personenmonate (z.B. "1", "2", "3", "4") waren im
   Dropdown waehlbar und brachen die "offene Stunden"-Berechnung.
2. AP aus lange zurueckliegenden Arbeitsplan-Phasen wurden immer noch im
   aktuellen Monat als "Zugeordnete AP" angeboten und sogar automatisch
   in die Matrix-Vorbelegung gezogen.

Die Loesung wurde in drei Deploy-Iterationen ausgerollt (7.4.6-2, -3, -4),
jeweils nach lokalem Test und PROD-Verifikation.

---

## Ausgelieferte Dateien (PROD)

| Datei | Ziel im Repo |
|-------|--------------|
| TimesheetForm-v7_4_6-4.tsx | src/components/shared/TimesheetForm.tsx |
| berater-ze-seite-v7_4_6-2.tsx | src/app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx |
| zeiterfassung-page-v7_4_6-2.tsx | src/app/v7/firma/zeiterfassung/page.tsx |

---

## Wichtige Commits

```
git log --oneline --first-parent main -- | head -10
```

- v7.4.6-4: Vorbelegte AP-Zeilen nach ap_number/ap_sub_number sortiert
- v7.4.6-3: Trennung von Dropdown und Matrix-Vorbelegung; Weitere AP wieder offen
- v7.4.6-2: AP-Dropdown filtert Ueberschriften und Laufzeit (Monatsende +2 Monate)

---

## Regel-Matrix (finaler Stand)

### Grundregel: Ein AP ist waehlbar, wenn

1. `total_person_months > 0` (keine Ueberschriften)
2. `start_date` UND `end_date` sind gesetzt
3. `is_active = true`

### Dropdown "Zugeordnete AP"

- AP ist in `assignedWPIds` (MA hat planned_pm > 0)
- Restliche Stunden: `planned - booked > 0`
- Laufzeit-Check: `end_date + 2 Monate >= Monatsende` des gewaehlten Monats
- **Identische Regel fuer Matrix-Vorbelegung** (ab v7.4.6-3)

### Dropdown "Weitere AP"

- Alle uebrigen waehlbaren AP des Projekts
- KEIN Laufzeit-Check (Vertretungsfall-Option)

### Matrix-Sortierung (v7.4.6-4)

- Zeilen werden nach `ap_number` (primaer) und `ap_sub_number` (sekundaer)
  aufsteigend sortiert.

---

## Helper-Funktionen in TimesheetForm (ab v7.4.6-2)

```typescript
const isSelectableAP = (wp: WorkPackage): boolean => {
  const pm = wp.total_person_months ?? 0;
  if (pm <= 0) return false;
  if (!wp.start_date || !wp.end_date) return false;
  return true;
};

// Referenzdatum = Monatsende des gewaehlten Timesheet-Monats
const getReferenceDate = (): Date => {
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  return new Date(selectedYear, selectedMonth - 1, daysInMonth);
};

const isAPInAssignedGroup = (wp: WorkPackage): boolean => {
  if (!isSelectableAP(wp)) return false;
  if (!assignedWPIds.includes(wp.id)) return false;
  const planned = plannedHoursPerWP[wp.id] || 0;
  const booked = totalBookedPerWP[wp.id] || 0;
  if (planned <= 0) return false;
  if ((planned - booked) <= 0) return false;
  const endDate = new Date(wp.end_date as string);
  const endPlus2 = new Date(endDate.getFullYear(), endDate.getMonth() + 3, 0);
  const ref = getReferenceDate();
  return endPlus2 >= ref;
};

const isAPInWeitereGroup = (wp: WorkPackage): boolean => {
  if (!isSelectableAP(wp)) return false;
  return !isAPInAssignedGroup(wp);
};
```

---

## WorkPackage-Interface erweitert

```typescript
interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_sub_number?: number;
  ap_code: string | null;
  name: string;
  is_technical?: boolean | null;
  total_person_months: number | null;  // NEU v7.4.6-2
  start_date: string | null;            // NEU v7.4.6-2
  end_date: string | null;              // NEU v7.4.6-2
}
```

Entsprechend erweiterte SELECT-Statements in:

```typescript
// berater-ze-seite / zeiterfassung-page:
.from('v7_work_packages')
.select('id, project_id, ap_number, ap_sub_number, ap_code, name, is_technical, total_person_months, start_date, end_date')
```

---

## Lessons Learned Session 26

### L26-1: JavaScript-Date-Rollover bei Monatsarithmetik

Die erste Implementierung von `endPlus2` nutzte
`new Date(year, month + 2, day)`. Bei `end_date = 31.07.`, `month = 6`,
`day = 31` ergibt das `new Date(2025, 8, 31)` = automatisch 01.10.2025
(September hat nur 30 Tage -> Rollover). Das verfaelschte den Vergleich.

**Loesung:** `new Date(year, month + 3, 0)` = letzter Tag des Monats vor
"Monat + 3" = letzter Tag von "Monat + 2". Das ist sauber monatsgrenzen-
agnostisch.

### L26-2: const-Funktionen werden in JavaScript NICHT gehoistet

Die Helper-Funktion `getReferenceDate` wollte urspruenglich die bereits
weiter unten im File definierte `getDaysInMonth`-Funktion verwenden.
Da beide in derselben Funktions-Ebene als `const` deklariert sind, ist
`getDaysInMonth` zum Zeitpunkt des ersten Aufrufs von `getReferenceDate`
noch nicht initialisiert -> Runtime-Error.

**Loesung:** Inline-Replikation der wenigen benoetigten Zeilen:
```typescript
const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
```

### L26-3: Lokaler Test IMMER vor Push (bestaetigt aus Session 25)

Sortier-Bug in Matrix-Vorbelegung wurde erst beim lokalen Durchklick
sichtbar (APs kamen in zufaelliger DB-Query-Reihenfolge: 5, 7, 3, 4, 6, 8
statt 3, 4, 5, 6, 7, 8). `pnpm build` hat das nicht aufgedeckt.

### L26-4: Diagnostik beim Feedback aus PROD

Der Kunde hat zunaechst gesagt "AP-Ueberschriften weg, aber AP 1.x immer
noch waehlbar". Erste Hypothese: Filter greift nicht. Tatsaechlicher Grund:
Filter greift doch, aber **Matrix-Vorbelegung** ist ein separater Mechanismus,
der denselben Filter noch nicht hatte. Daraus wurde klar, dass Dropdown
und Vorbelegung getrennt zu betrachten sind.

---

## Datenbank-Aenderungen

**Keine Schema-Aenderungen in Session 26.**

Alle benoetigten Felder (`total_person_months`, `start_date`, `end_date`
auf `v7_work_packages`) waren bereits vorhanden und wurden bisher nur
nicht in die SELECT-Statements der Wrapper-Seiten aufgenommen.

---

## Aufraeumarbeiten (downloads/)

Folgende Dateien wurden nach erfolgreichem PROD-Deploy ins archiv/
verschoben (Befehle in Session ausgegeben):

- TimesheetForm-v7_4_6-1.tsx
- TimesheetForm-v7_4_6-2.tsx
- TimesheetForm-v7_4_6-3.tsx
- berater-ze-seite-v7_4_6-1.tsx
- zeiterfassung-page-v7_4_6-1.tsx
- PFLICHTENHEFT-v4_66.md, v4_67.md, v4_68.md, v4_69.md
- KONZEPT-ARBEITSZEITGRENZEN-v1_0.md
- v7-types-v7_4_6-1.ts
- EmployeeManagement-v7_3_95-6.tsx bis -11.tsx + ECHT-7
- migration_holiday_region_v7_4_6.sql (alter Dateiname; altdaten_* bleibt)

Aktuell live in downloads/ (entspricht PROD):
- TimesheetForm-v7_4_6-4.tsx
- berater-ze-seite-v7_4_6-2.tsx
- zeiterfassung-page-v7_4_6-2.tsx
- EmployeeManagement-v7_3_95-12.tsx
- v7-types-v7_4_7-1.ts

---

## Datenbank-Snapshot (DEV vs. PROD)

**PROD-Kunden (8 Firmen):**
Androlite GmbH, AS System, Cubintec GmbH, Fischbach Bauunternehmung,
Global Maritime Management, Luebeck Yacht Trave Schiff,
Steuerkanzlei Robin Freund, STOMA

**DEV-Kunden (4 Firmen):**
AS System, Cubintec, Luebeck Yacht Trave, Tippl GmbH

**Feiertagsregion (PROD):**
- Androlite GmbH -> BY_EVAN

**Feiertagsregion (DEV):**
- Cubintec GmbH -> BY_KATH (Testeintrag)

**Offen:** `migration_teilzeit_historie_v7_4_7-2.sql` wurde in keiner DB
ausgefuehrt. Phase 3 Arbeitszeitgrenzen wuerde aber ohnehin erst darauf
aufbauen, daher verbleibt es bis dann als offener Punkt.

---

## Naechste Session - Startpunkt

**Prio 1:** User Manuals PL + Admin aktualisieren (v2.0 ist zu veraltet).

**Prio 2:** Berater-Portal User Manual (PDF) erstellen.

**Prio 3:** Phase 3 Arbeitszeitgrenzen - Ampel-Trio Live-Validierung.

**Prio 4:** Stundennachweis-Wording projekttyp-spezifisch.

**Nice to have:** Vercel-Setup (§14) pruefen / Preview-Builds ausschalten.

---

**Ende der GIT-SICHERUNG Session 26**
