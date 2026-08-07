# GIT-SICHERUNG - Session 75 (V7.9.0)

**Datum:** 6.-7. August 2026
**SW-Release:** V7.9.0 (AP-Status-Analyse + Feature-Freigaben je Firma - in PRODUKTION)
**Pflichtenheft:** v5.33
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_8_2-session75.md (diese Datei ist die vollstaendige
Fassung derselben Session 75; die -8_2-Fassung deckte nur den ersten Teil ab).

**Deploy-Stand:** In PROD sind: ZAPanel v7.4.4-64; TimesheetForm v7.4.6-73/-74/-75/-76;
AP-Analyse Stufe 1-3 (StundennachweisMatrix v7.4.6-13, ApStatusModal v1.0-1,
SystemConfigPanel v7.4.4-4, BerichtePage v7.4.6-24, zeiterfassung-page v7.4.6-5) inkl.
DB-Migration (ap_analyse_firma_freigeschaltet, DEV+PROD); SystemConfigPanel v7.4.4-5
(Feature-Matrix). NICHT deployt (bewusst): der Direktsprung (ApStatusModal v1.0-2,
StundennachweisMatrix v7.4.6-14) - wird im naechsten Schritt in EINE gemeinsame
Komponente refaktoriert (siehe "Offen / naechste Schritte").

---

## Uebersicht der Themen dieser Session

1. ZA-Uebersetzungsschutz (Monatsdarstellung Anlage 1a).
2. AP-Status im Timesheet: MA-Aufschluesselung (geplant/gebucht/offen je MA), Farben,
   Wochen-Deckel der Auto-"sonstige", Monats-Aufschluesselung.
3. AP-Status-Analyse als eigenes Management-Werkzeug (Stufe 1-3): Stunden in der
   Matrix, eigenstaendiger AP-Status-Dialog + Zugang, Firmen-Freischaltung.
4. Feature-Freigaben je Firma als Matrix (erweiterbar).
5. Architektur-Entscheidung: gemeinsame Komponente statt Doppelpflege (Refactor folgt).

---

## 1. ZAPanel v7.4.4-64 - ZA-Dokumente von Browser-Uebersetzung ausnehmen

Die drei amtlichen ZA-Container (Deckblatt, Anlage 1a, Anlage 1b - je #za-print-area)
mit translate="no" + class notranslate versehen. Behebt die nutzerabhaengig verdrehte
Monatsspalte in Anlage 1a ('25 Dez' statt 'Dez. 25'): Ursache war NICHT der Code
(Labels fest via toLocaleString('de-DE')), sondern eine Browser-Uebersetzungsschicht
(Chrome-Seitenuebersetzung / Immersive Translate). Fuer korrekt sehende Nutzer
byte-identisch, Druck-Logik unberuehrt. Reine Anzeige.

## 2. TimesheetForm - AP-Status im "Alle AP"-Modal (v7.4.6-66..-77)

- **-66..-73:** MA-Aufschluesselung. Je Gruppe (geplant/gebucht/offen) zuerst 'gesamt',
  dann eine Spalte pro Projekt-Team-MA (Kopf 'V.Nachname'); alles in STUNDEN. geplant je
  MA aus v7_work_package_assignments.planned_person_months x hoursPerPM (teamweiter Load,
  plannedHoursPerWpPerMa), 'gesamt' = AP-Soll (total_person_months); gebucht je MA aus
  v7_timesheets (projektweit, um employee_id erweitert, projectBookedPerWpPerMa); offen je
  MA = geplant-gebucht. Layout iteriert: gesamt vorn, Gruppenrahmen, zentriert,
  inhaltsbasierte Breite (w-auto/text-xs), Modal w-fit + max-w-[96vw], Fusszeile entfernt.
  -73: offene Stunden (+) gruen, ueberbucht (-) rot.
- **-74:** WOCHEN-DECKEL fuer die Auto-Vorbelegung "sonstige Arbeiten". Teilzeit-MA (z.B.
  30 h/4 Tage) bekam am 5. Werktag faelschlich 6 h "sonstige", obwohl die WAZ an 4 Tagen
  erreicht war. Fix: laufendes Wochenkonto (Projekt + andere Projekte + Abwesenheiten +
  bereits gesetzte "sonstige") gegen die WAZ; Auto-Wert je Tag = min(Tagesspielraum,
  Wochen-Restbudget). Vollzeit unveraendert.
- **-75:** Monats-Aufschluesselung. Mehrmonatige APs (Buchungen in >1 Monat) sind per
  Chevron aufklappbar -> Unterzeilen mit gebucht je MA je Monat (projectBookedPerWpPerMaMonth,
  work_date-Bucket). Aufklappen folgt den TATSAECHLICHEN Buchungsmonaten (macht "geplant
  1 Monat, gebucht in 2 Monaten" sichtbar).
- **-76:** Gating (Stufe 3b). Das Aufklappen ist Teil der vertieften AP-Status-Analyse:
  sichtbar nur fuer Berater bzw. FREIGESCHALTETE Firmen
  (apAnalyseEnabled = portal==='berater' || company.ap_analyse_firma_freigeschaltet).
- **-77 (NICHT deployt):** In-Page-Direktsprung aus dem "Alle AP"-Modal -> wird durch den
  Refactor abgeloest, siehe unten.

## 3. AP-Status-Analyse als Management-Werkzeug (Stufe 1-3)

- **Stufe 1 - StundennachweisMatrix v7.4.6-11/-12:** In jeder Monatszelle zusaetzlich die
  gebuchte Monats-Stundenzahl je MA als kleine Zahl unter der Ampel. WICHTIG (-12): nur
  FOERDERBARE Stunden (is_billable === true), NICHT die nicht-foerderbaren "sonstigen"
  (relevant bei GF mit 50%-Regel). Ampel-Status unveraendert. Fuer Berater UND Firma
  sichtbar (nicht schaltbar).
- **Stufe 2 - DB + Admin:** Neue Spalte v7_client_companies.ap_analyse_firma_freigeschaltet
  (boolean, Default false; DEV+PROD, SQL-MIGRATION-ap-analyse-firma-freigabe-v1.sql).
  SystemConfigPanel v7.4.4-4: Schalter je Firma (nur system_admin), analog vn_firma_freigeschaltet.
- **Stufe 3 - Zugang + Gating:**
  - **3a:** Eigenstaendige Komponente **ApStatusModal v1.0-1** (laedt Daten selbst per
    projectId: v7_projects, v7_client_companies, v7_work_packages, v7_project_assignments,
    v7_employees, v7_work_package_assignments, v7_timesheets). Button "AP-Status" in der
    StundennachweisMatrix v7.4.6-13 (neben "Sammeldruck") oeffnet den Dialog direkt - kein
    Umweg mehr ueber ein Timesheet. Sichtbarkeit ueber Prop apAnalyseEnabled.
  - **3b:** Gating des Monats-Aufklappens im Timesheet (TimesheetForm -76, s.o.).
  - **3c:** Firmen-Elternseiten reichen das Flag durch: BerichtePage v7.4.6-24 (Firmen-
    Dashboard-Matrix, apAnalyseEnabled an die Matrix), zeiterfassung-page v7.4.6-5
    (Firmen-Timesheet, company-Query um die Spalte erweitert). Berater-Seiten: Default frei.

## 4. SystemConfigPanel v7.4.4-5 - Feature-Freigaben als Matrix

Die bis dahin getrennten Firmen-Freigabe-Listen (VN, AP-Status) zu EINER Tabelle
zusammengefasst: Zeilen = Firmen (mit Suche), Spalten = Features (Toggle je Zelle, sofort
gespeichert, Spinner/Check). Erweiterbar ueber ein featureDefs-Array (neues Feature = ein
Eintrag + State/Toggle + DB-Spalte -> automatisch neue Spalte). Cockpit-Freischaltung und
Anleitungen-Downloads (globale Schalter) bleiben separat.

---

## DB-Migrationen (DEV + PROD ausgefuehrt)

- **SQL-MIGRATION-ap-analyse-firma-freigabe-v1.sql:** ALTER TABLE v7_client_companies ADD
  COLUMN IF NOT EXISTS ap_analyse_firma_freigeschaltet boolean NOT NULL DEFAULT false.
  Idempotent, DEV und PROD, alle Firmen Default false. (Kein weiterer DB-Eingriff diese Session.)

---

## Code-Integration (Status) - Session 75

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| ZAPanel-v7_4_4-64.tsx | src/components/shared/ZAPanel.tsx | DEPLOYED |
| TimesheetForm-v7_4_6-76.tsx | src/components/shared/TimesheetForm.tsx | DEPLOYED (enthaelt -66..-76) |
| StundennachweisMatrix-v7_4_6-13.tsx | src/components/shared/StundennachweisMatrix.tsx | DEPLOYED |
| ApStatusModal-v1_0-1.tsx | src/components/shared/ApStatusModal.tsx | DEPLOYED (NEU) |
| SystemConfigPanel-v7_4_4-5.tsx | src/components/shared/SystemConfigPanel.tsx | DEPLOYED (enthaelt -4) |
| BerichtePage-v7_4_6-24.tsx | src/components/shared/BerichtePage.tsx | DEPLOYED |
| zeiterfassung-page-v7_4_6-5.tsx | src/app/v7/firma/zeiterfassung/page.tsx | DEPLOYED |
| TimesheetForm-v7_4_6-77.tsx | (Direktsprung) | NICHT deployt -> Refactor |
| ApStatusModal-v1_0-2.tsx | (Direktsprung) | NICHT deployt -> Refactor |
| StundennachweisMatrix-v7_4_6-14.tsx | (Direktsprung) | NICHT deployt -> Refactor |

Deploy je Merge v7-dev -> main (--no-ff), push **origin + cubintec**, Vercel. Bei den
DB-abhaengigen Teilen: SQL zuerst in DEV UND PROD, dann Code.

---

## Architektur-Entscheidung (verbindlich fuer die Weiterentwicklung)

**Alles, was von mehreren Stellen genutzt wird, gehoert an EINE zentrale Stelle
(Shared-Komponente / Shared-Funktion) mit klar definierten Schnittstellen** - keine
Parallel-/Doppelentwicklung. Ziel: modulare, systematisch aufgebaute SaaS-Version, die
auch von anderen gut weiterpflegbar ist (GL Martin, 07.08.2026).

Konkreter Anwendungsfall: Die AP-Status-Uebersicht existiert derzeit ZWEIMAL - als
Inline-Modal in TimesheetForm UND als eigenstaendige ApStatusModal. Das ist historisch
gewachsen (Extraktion fuer den Matrix-Button, ohne das Original zu ersetzen). Das
unterschiedliche Sprung-Verhalten (in-page im Timesheet vs. Navigation aus der Matrix) ist
KONTEXT-, nicht Portal-bedingt und wird per Callback injiziert.

## Offen / naechste Schritte

- **REFACTOR (naechster Schritt, beauftragt):** ApStatusModal wird die EINZIGE
  AP-Status-Uebersicht. TimesheetForm nutzt kuenftig ApStatusModal statt seines Inline-Modals
  (dessen ~250 Zeilen entfallen). Schnittstellen: ApStatusModal erhaelt Props
  `showMonthly` (Firmen-Gating) und `onJumpToTimesheet` (Sprung-Verhalten je Aufrufer:
  Timesheet = in-page MA/Monat wechseln; Matrix = navigieren + Ueberssicht nach Rueckkehr
  automatisch wieder oeffnen via sessionStorage 'pze_apstatus_reopen'). Danach lebt Tabelle
  UND Sprung-Logik nur einmal. Ergebnis als neue ApStatusModal-Version + angepasste
  TimesheetForm + StundennachweisMatrix; die nicht deployten -14/-2/-77 gehen darin auf.
- Uebernommen aus frueheren Sessions: KMU-innovativ PDF-Import; PH §4 Versions-Nachzug;
  Enum-Vereinheitlichung v7_funding_format DEV/PROD; Manuals-Nachzug; Datenhygiene
  Loesch-Kaskade; 'Assistenz GL'-Rolle; Max-foerderbare-Stunden-Chip.

---

## Komponenten / Dateien dieser Session (deployed src/)

- src/components/shared/ZAPanel.tsx (v7.4.4-64)
- src/components/shared/TimesheetForm.tsx (v7.4.6-76)
- src/components/shared/StundennachweisMatrix.tsx (v7.4.6-13)
- src/components/shared/ApStatusModal.tsx (v1.0-1, NEU)
- src/components/shared/SystemConfigPanel.tsx (v7.4.4-5)
- src/components/shared/BerichtePage.tsx (v7.4.6-24)
- src/app/v7/firma/zeiterfassung/page.tsx (v7.4.6-5)

**DB (DEV + PROD):** v7_client_companies.ap_analyse_firma_freigeschaltet (boolean, false).

**Doku:** PFLICHTENHEFT-v5_33.md; GIT-SICHERUNG-v7_9_0-session75.md (diese Datei);
DEPLOY-PROZESS-PZE.md (unveraendert gueltig: main auf origin + cubintec).
