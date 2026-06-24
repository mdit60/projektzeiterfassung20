# GIT-SICHERUNG - Session 59

**Datum:** 24. Juni 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v5.10
**Branch:** main (PROD deployed) / v7-dev
**Merge-Commit:** 9cb9c9b (origin + cubintec)

---

## Zusammenfassung

A-034 **PROD-Phase**: die in Session 58 in DEV gebaute zentrale,
projektuebergreifende Abwesenheit (`v7_employee_absences`) ist jetzt auch in
**PRODUKTION** live. Es wurde **kein** neuer Code geschrieben - reiner Deploy
des Session-58-Standes plus die an PROD angepasste DB-Migration im Dual-Read.

---

## Diagnose PROD (cnnuyioklhlrfygwticf, read-only)

Vor jeder Schreiboperation gegen die Ziel-DB geprueft (DEV und PROD sind NICHT
synchron):

- **S0** Spaltenpruefung: `v7_timesheets` hat `absence_code`, `work_package_id`,
  `notes` (die mitgelieferte CSV war veraltet -> Spaltennamen der Migration
  passen unveraendert).
- **S0b**: `v7_employee_absences` existierte in PROD noch nicht (frischer CREATE).
- **D1** Geisterfirmen unter MA mit Abwesenheiten: **0** (anders als DEV; AutoSyn
  ist in PROD eine echte Firma, Bayern).
- **Q1** Umfang: U=561/561, K=70/70, S=126 roh / **124** dedup.
- **Q2** Code-Konflikte (gleicher MA-Tag, verschiedene Codes): **leer** -> Guard
  greift nicht.
- **Q3** S-Liste (124 Tage) gegen die gesetzlichen Feiertage je Bundesland
  geprueft (germanHolidays normalisiert `DE-SH` und Langnamen identisch -> der
  schiefe Wert `DE-SH` bei Steuerkanzlei Robin Freund ist rein kosmetisch).

---

## PROD-Migration: SQL-MIGRATION-employee-absences-v2.sql

Abgeleitet aus v1 (DEV). **Einzige inhaltliche Abweichung**: die Feiertags-S
werden im INSERT von vornherein ausgeschlossen.

- **Feiertags-S-Ausschluss** ueber eine explizite, geprueft Datums-/
  Bundesland-Liste: bundesweite Feiertage (Karfreitag, Ostermontag, 01.05.,
  Christi Himmelfahrt, Pfingstmontag, 03.10., 25./26.12., Neujahr - jeweils 2025
  und 2026) plus regional **Fronleichnam 19.06.2025 (nur NW)** und
  **Reformationstag 31.10.2025 (nur SH)**. Beide regionalen Faelle traten nur bei
  Firmen im qualifizierenden Bundesland auf - keine Fehlausschluesse.
- **Backup und Deaktivierung bleiben breit** (alle aktiven U/K/S): die
  Feiertags-S werden in `v7_timesheets` deaktiviert, aber NICHT migriert
  (Feiertag wird in der App berechnet, nicht gespeichert).
- **5 echte Sonderurlaube** bleiben als S: Linfert + Schoebel je 24.12. und
  31.12. (Heiligabend/Silvester, keine gesetzlichen Feiertage), Tenostendarp
  02.01.2026.
- **KEIN RLS-Block** in PROD. `v7_employee_absences` bleibt - wie `v7_timesheets`
  in PROD - vorerst ohne RLS. Bewusste Divergenz zu DEV (dort RLS aktiv);
  Angleich gesammelt im separaten RLS-Backlog-Punkt.
- Konflikt-Guard und datierte Backup-Tabelle `v7_timesheets_absence_backup_20260624`
  wie in v1 (Schutz gegen Doppel-Migration).

---

## Gekoppelter Deploy (Dual-Read, 4 Schritte)

Reihenfolge bewusst getrennt, um weder eine fehlende Tabelle noch ein
Verschwinden der Abwesenheiten unter altem Code zu riskieren:

1. **Block 1** (Tabelle + partieller UNIQUE-Index) in PROD ausgefuehrt; Tabelle
   leer, alter Code unbeeinflusst. Index `ux_v7_employee_absences_active`
   verifiziert.
2. **Code-Push** auf beide Remotes: `git checkout main && git pull && git merge
   v7-dev --no-ff --no-edit && git push origin main && git push cubintec main &&
   git checkout v7-dev`. Merge-Commit **9cb9c9b** (791db13..9cb9c9b auf origin
   UND cubintec).
3. **Vercel**: PROD-Deployment fuer 9cb9c9b auf **Ready/Production** abgewartet
   (Build 41s).
4. **Block 2-4** unmittelbar danach: Guard + Backup + INSERT + Deaktivierung in
   EINER Transaktion -> kein Doppelzaehl-Fenster.

---

## Verifikation PROD (Block 5)

- `absences_aktiv = 636` / `backup_zeilen = 757` / `ts_rest_aktiv = 0`.
  (Backup != absences ist gewollt: Backup roh inkl. Feiertags-S, absences
  dedupliziert und ohne Feiertage.)
- Je Code: **U = 561** (4320,9 h), **K = 70** (560 h), **S = 5** (34,5 h).
- Die 5 verbliebenen S exakt wie geplant.

Live in der App (Berater-Portal) durchgeklickt:
- Ehemalige Feiertags-S erscheinen als **berechneter Feiertag** (Bayer 25./26.12.
  orange, Arbeitszellen gesperrt, keine doppelte Abwesenheit).
- **Echter Sonderurlaub** bleibt **S** (Linfert 24./31.12. je 7,5 h).
- **Projektuebergreifend**: Abwesenheit aus einem Projekt erscheint automatisch im
  zweiten Projekt desselben MA (live bestaetigt).
- **Berichte / Sammeldruck** laden fehlerfrei, Stunden plausibel.

---

## Geaenderte / neue Dateien

**Code:** keine. Session 59 hat keinen Code veraendert (reiner PROD-Deploy des
Session-58-Standes). Komponentenversionen unveraendert: TimesheetForm
v7.4.6-47, BerichtePage v7.4.6-20, StundennachweisMatrix v7.4.6-6,
useBerichteData v1.0.2, lib employeeAbsences v1.0.0.

**Neu (Artefakte):**
- `SQL-MIGRATION-employee-absences-v2.sql` (PROD ausgefuehrt)
- `PFLICHTENHEFT-v5_10.md`
- `GIT-SICHERUNG-v7_4_9-session59.md`

---

## Offen / Parkplatz

- PH 12.1: A-034 **erledigt (DEV+PROD)**. NEU offen:
  - **A-036** Feiertagszelle in der Ausfallzeiten-Zeile an berechneten Feiertagen
    sperren (UX-Haertung). Vorbestehend, kein Regress. ENTSCHAERFT: der
    Speicherpfad schuetzt bereits (`if (code === 'S' && isHoliday(...)) return`)
    - kein Feiertags-S persistierbar; rein fehlende UI-Sperre.
  - **A-037** Footer-Build-Marker: PortalFooter-Quelle ins Projekt nachziehen
    (live 'Build 43' inkl. Build-Segment, Projektdatei v7.4.9-1 ohne Marker) und
    Marker kuenftig im Versions-Ritual hochzaehlen.
- Weiterhin offen: A-001, A-006, A-012, A-013, A-019.
- RLS-Angleich DEV/PROD: `v7_employee_absences` (PROD ohne RLS) gemeinsam mit
  `v7_timesheets` (PROD ohne RLS) in einem eigenen RLS-Punkt aktivieren/testen.
- Parkplatz: Vercel-Account-Trennung, Supabase-Projekttransfer in Cubintec-Org,
  spaeter PROD->DEV-Resync der Stammdaten.
