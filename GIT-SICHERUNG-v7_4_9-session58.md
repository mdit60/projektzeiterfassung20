# GIT-SICHERUNG - Session 58

**Datum:** 24. Juni 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v5.09
**Branch:** v7-dev (DEV) - **PROD-Deploy steht aus**

---

## Zusammenfassung

A-034: **zentrale, projektuebergreifende Abwesenheiten.** Abwesenheit (Urlaub,
Krankheit, Sonderurlaub) ist ab jetzt eine Eigenschaft des **Mitarbeiters an
einem Tag**, nicht des Projekts. Einmal erfasst, erscheint sie automatisch in
allen parallelen Projekten des MA - keine Doppeleingabe, keine Differenzen.

Umgesetzt und verifiziert in **DEV**. Die **PROD-Phase ist bewusst noch nicht
ausgefuehrt** (eigener, eng gekoppelter Schritt: Diagnose + angepasste Migration
+ Deploy). Es wurde in dieser Session **nichts** auf die Remotes gepusht.

---

## DB-Migration (NUR DEV ausgefuehrt)

`SQL-MIGRATION-employee-absences-v1.sql`:
- **NEU Tabelle `v7_employee_absences`** (id, employee_id, client_company_id NOT NULL,
  work_date, absence_code CHECK U/K/S, hours, note, entered_by, entered_at,
  is_active, created_at, updated_at).
- Partieller **UNIQUE-Index** auf (employee_id, work_date) WHERE is_active = true,
  NULLS NOT DISTINCT - genau eine aktive Abwesenheit pro MA und Tag.
- **RLS aktiv**, 4 Policies exakt aus `v7_timesheets` gespiegelt
  (v7_can_access_client / v7_is_consultant / v7_get_user_role).
- **Migration** der Alt-Abwesenheiten aus `v7_timesheets` in einer Transaktion:
  Konflikt-Guard (RAISE EXCEPTION bei Code-Kollision), Backup-Tabelle
  `v7_timesheets_absence_backup_20260624`, dedup-INSERT (DISTINCT ON
  employee_id, work_date - faltet Mehrfach-Projekt-Zeilen gleichen Codes),
  danach Alt-U/K/S in `v7_timesheets` deaktiviert (Dual-Read, kein Doppelzaehlen).
- Verifikation: **378** Abwesenheiten migriert (U=331, K=43, S=4), Backup=378,
  ts_rest_aktiv=0, RLS + 4 Policies bestaetigt.

**KA (Kurzarbeit)** und **F (Feiertag)** bleiben in `v7_timesheets` bzw. werden
berechnet - sie wandern NICHT in die zentrale Tabelle.

---

## Stammdaten-Reparatur (Vorbedingung, DEV)

Die Migration scheiterte zunaechst an einer FK: fuenf Mitarbeiter + Projekt VETIS
zeigten auf `client_company_id c97d8105...` (Automotive Synergies GmbH & Co. KG /
AutoSyn), die in DEV `v7_client_companies` fehlte - eine "Geisterfirma" aus einem
fruehen PROD->DEV-Resync (Mitarbeiter/Projekte/Timesheets kopiert, Firmenzeile
nicht). Behoben in einer Transaktion: inaktives Namens-Duplikat temporaer
umbenannt (UNIQUE frei), echte Firma mit **Original-UUID** angelegt
(consultant_company_id = Cubintec db94308e...), dynamischer DO-Block haengte alle
eingehenden FKs (9 referenzierende Tabellen) vom Duplikat auf die echte UUID um,
Duplikat geloescht. Geisterfirmen-Check danach 0 Zeilen.

## Feiertags-S-Bereinigung (DEV)

Von den 4 migrierten S-Zeilen waren 25./26.12. (Schulze-Hagenest, je 8 h) echte
gesetzliche Feiertage -> aus `v7_employee_absences` **deaktiviert** (Feiertage
werden berechnet, nicht gespeichert). 24./31.12. (Schoebel, je 6 h Teilzeit) sind
**keine** Feiertage (firmenindividuelle Regelung) -> bleiben als S.

---

## Architektur

**Dual-Read** waehrend der Umstellung: Die Lesepfade lesen sowohl alte
Abwesenheits-Zeilen aus `v7_timesheets` als auch die neue Tabelle; da die
Migration die Alt-Zeilen deaktiviert, wird nie doppelt gezaehlt - PROD-tauglich
ohne Ausfallfenster.

**NEU `src/lib/employeeAbsences.ts`** (`loadEmployeeAbsencesAsTimesheets`):
laedt die zentralen Abwesenheiten, mappt jede ueber das Assignment-Fenster
(assignment_start/end, NULL = offen) auf die jeweiligen Projekte und liefert
**synthetische** Timesheet-Zeilen (id `abs:<absId>:<projId>`, is_billable=false,
_synthetic=true) fuer Matrix / Sammeldruck / Berichte.

**Schreibpfad TimesheetForm in drei Etappen:**
- **2a Laden:** zusaetzliche Query auf `v7_employee_absences` (kein Projektfilter),
  die U/K/S projektuebergreifend in die Fehlzeit-Zeilen schreibt (Vorrang vor
  evtl. Alt-Werten).
- **2b Speichern:** U/K/S werden NICHT mehr als `v7_timesheets`-Zeilen
  geschrieben, sondern in `v7_employee_absences` ueber **(Mitarbeiter, Monat)**
  synchronisiert: neu anlegen / geaenderte aktualisieren / entfernte deaktivieren.
  Sonderurlaub (S an Nicht-Feiertag) wandert mit; S an einem berechneten Feiertag
  bleibt aussen vor. Harte **Konfliktpruefung**: pro Tag nur EIN Code.
- **2c Cross-Projekt-Abwesenheitssperre:** an einem Abwesenheitstag ist in keinem
  Projekt eine Arbeitsbuchung moeglich (ganztaegig). AP- und
  Nicht-foerderbar-Zellen sind gesperrt (disabled + Tooltip), beide
  Eingabe-Handler blockieren Arbeitswerte hart, der Speicher-Backstop bleibt.
  Die Fehlzeit-Zeilen bleiben editierbar (Umklassifizieren U->K, Loeschen).

**Bewusst NICHT gebaut:** automatisches Spiegeln von Arbeitsstunden zwischen
Projekten. Jede Stunde bleibt in genau einem Projektnachweis; die
projektuebergreifende 9-h-Tagesgrenze (A-021) sichert die Plausibilitaet.

---

## Geaenderte / neue Dateien (DEV)

**Neu:**
- `src/lib/employeeAbsences.ts` -> **1.0.0**
- `SQL-MIGRATION-employee-absences-v1.sql` (DEV ausgefuehrt)

**Lesepfade (Dual-Read):**
- `src/hooks/useBerichteData.ts` -> **1.0.2**
- `src/components/shared/BerichtePage.tsx` -> **7.4.6-20**
- `src/components/shared/StundennachweisMatrix.tsx` -> **7.4.6-6**

**Schreibpfad:**
- `src/components/shared/TimesheetForm.tsx` -> **7.4.6-47**
  (v7.4.6-45 Laden / v7.4.6-46 Speichern / v7.4.6-47 Sperre)

Unveraendert (reine Transformation/Anzeige, kein DB-Read):
`StundennachweisSheet.tsx`, `lib/stundennachweisSheetData.ts`.

---

## Deploy

**Noch kein Deploy.** Alles liegt auf `v7-dev` / in DEV. Kein Push auf origin
oder cubintec in dieser Session.

PROD-Phase (eigener, gekoppelter Schritt):
1. Diagnose PROD (`cnnuyioklhlrfygwticf`): Geisterfirmen-Check + Kollisions-Queries
   Q1/Q2 vor dem CREATE der Migration.
2. PROD-Migration anpassen: Feiertags-S **von vornherein** ausschliessen
   (regionsabhaengig - vermutlich ueber Ausschluss von Voll-Tages-S an
   bundesweiten Feiertagen + Klaerungsliste der Grenzfaelle).
3. Deploy gekoppelt: Code auf **beide** Remotes
   (`git push origin main && git push cubintec main`, cubintec triggert PROD)
   zusammen mit der DB-Migration im Dual-Read.
4. Footer-Marker live verifizieren.

---

## Offen / Parkplatz

- §12.1: A-034 **DEV erledigt / PROD offen**; weiterhin offen A-001, A-006,
  A-012, A-013, A-019.
- Stufe-2-DB-Absicherung (separates Thema): partieller UNIQUE-Index auf
  `v7_timesheets` (Kollisions-Queries Q1/Q2 zuerst).
- `v7_timesheets` RLS in PROD deaktiviert (in DEV aktiv) - eigener Punkt.
- Parkplatz: Vercel-Account-Trennung, Supabase-Projekttransfer in Cubintec-Org,
  spaeter PROD->DEV-Resync der Stammdaten.
