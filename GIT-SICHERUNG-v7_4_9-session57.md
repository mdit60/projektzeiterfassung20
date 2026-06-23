# GIT-SICHERUNG - Session 57

**Datum:** 23. Juni 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v5.08
**Branch:** v7-dev -> main (beide Remotes)

---

## Zusammenfassung

Ein grosses Thema: **projektbezogene Wochenarbeitszeit-Basis** (`pm_basis_weekly_hours`).
Selaflex GmbH hat zwei ZIM-DS-Projekte (InGrav 16DS251591, GRAVID 16DS251601),
die beide auf **37 h/Woche** bewilligt wurden, obwohl die Arbeitsvertraege real
**37,5 h** sind (Datenfehler im Antrag, wird bewusst NICHT korrigiert). Das System
rechnete bisher ueberall fest mit 40 h (173,33 h/PM). Loesung: saubere Trennung von
Firmen-Realitaet (37,5, ueber `standard_weekly_hours` + MA-`weekly_hours`) und
Foerderbasis (37, ueber neue Projektspalte `pm_basis_weekly_hours`).

Umgesetzt in drei Bausteinen (B = Arbeitsplan, C = Eingabefeld, A = Kosten-Panels)
plus der ZE-Kette. **DB-Migration** in PROD UND DEV.

---

## DB-Migration

`SQL-MIGRATION-pm-basis-weekly-hours-v1.sql`:
- `ALTER TABLE v7_projects ADD COLUMN IF NOT EXISTS pm_basis_weekly_hours numeric;`
  (nullable; NULL = erbt `standard_weekly_hours` der Firma).
- Beide Selaflex-Projekte (FKZ 16DS251591, 16DS251601) auf **37** gesetzt.
- WICHTIG/Lehre: zuerst nur in PROD ausgefuehrt -> die DEV-ZE-Seite scheiterte an
  der fehlenden Spalte ("Unbekannter Fehler beim Laden"). Schema-Aenderungen
  IMMER in DEV **und** PROD anlegen, auch wenn die Daten nur in einer DB liegen.

---

## Architektur

Zentraler Helfer in `projektfortschritt-utils`:
`hoursPerPM(weeklyHours) = weeklyHours * 52 / 12` (hoursPerPM(40) = 173,33).

Drei abgeleitete Groessen jetzt projektbasiert:
1. **PM -> Soll-Stunden** (Arbeitsplan): 1 PM = `hoursPerPM(pmBasis)` = 160,33 h bei 37 h.
2. **Foerder-Monatsgrenze** pro MA/Projekt: `hoursPerPM(pmBasis) * (weekly_hours / firmStd)`
   -> Vollzeit-Selaflex 160,33 h.
3. **Abrechnungs-Stundensatz/Kosten**: `rateScale` PRO MA = `weekly_hours / pmBasis`,
   sodass Plan-/Ist-Kosten = PM x Monatsgehalt. Behebt den frueheren Misch-Fehler
   (40-h-Stunden x realem Stundensatz, ~6,7 % zu hoch) und loest die Teilzeit-Nuance
   (jeder MA mit echtem Gehalt/echten Stunden).

NEU: **physischer projektuebergreifender Monatsdeckel** (harte Sperre) in
TimesheetForm: Summe ueber alle Projekte des MA <= `hoursPerPM(echte weekly_hours)`
= 162,50 h. (Die 9-h-Tagesgrenze war ueber A-021 bereits projektuebergreifend, die
Monatsgrenze bisher nur pro Projekt; relevant bei Linfert, der in beiden
Selaflex-Projekten ist.)

NEU: Eingabefeld **"Wochenarbeitszeit-Basis Antrag/Bescheid (h)"** im
Projekt-Bearbeiten-Dialog (ProjectDetailPage), leer = Firmenstandard. Keine
DB-Handarbeit mehr.

---

## Geaenderte Dateien

**Deploy 1 (Commit 79d2480, "v7.4.6-43"):**
- `src/lib/projektfortschritt-utils.ts` -> **7.4.9-3** (hoursPerPM, PFProject-Felder, Soll/PM/Kosten projektbasiert)
- `src/components/shared/TimesheetForm.tsx` -> **7.4.6-43** (Soll + Foerder-Monatsgrenze projektbasiert, NEU physischer Monatsdeckel)
- `src/app/v7/firma/zeiterfassung/page.tsx` -> **7.4.6-3** (pm_basis im Select)
- `src/app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx` -> **7.4.6-3** (pm_basis im Select)

**Deploy 2 (Sammel-Commit B+C+A):**
- `src/lib/projektfortschritt-utils.ts` -> **7.4.9-4** (rateScale PRO MA statt global; kein Firmenstandard-Durchreichen noetig)
- `src/components/shared/ProjectDetailPage.tsx` -> **7.4.4-59** (Eingabefeld pm_basis im Bearbeiten-Dialog, an WorkPackageTable durchgereicht)
- `src/components/shared/WorkPackageTable.tsx` -> **7.4.3-13** (Prop pmBasisWeeklyHours, Soll + Legende dynamisch)
- `src/components/shared/FirmaCockpit.tsx` -> **7.4.9-36-3** (pm_basis in Select + ProjektData)
- `src/components/shared/ProjektFortschrittPanel.tsx` -> **7.4.5-25** (pm_basis im Project-Interface)
- `src/components/shared/BerichtePage.tsx` -> **7.4.6-19** (pm_basis in Select + Interface)
- `src/app/v7/berater/foerderung/firma/[id]/cockpit/fortschritt/page.tsx` -> **7.4.9-6** (pm_basis im Select)

---

## Deploy

- Beide Deploys auf BEIDE Remotes gepusht (origin = mdit60/projektzeiterfassung20,
  cubintec = kkcub/pze-cubintec). cubintec loest den PROD-Build aus.
- Deploy 1: `81418e2..79d2480 main -> main` (beide Remotes), Vercel-Build gruen.
- Deploy 2: Sammel-Commit B+C+A, Vercel-Build gruen.
- PROD-Verifikation an Selaflex: Arbeitsplan "1 PM = 160,33 Stunden", Soll-Werte
  entsprechend niedriger; Kosten projektbasiert.

---

## Offen / Parkplatz (unveraendert)

- Offene §12.1-Punkte: A-001, A-006, A-012, A-013, A-019, A-034.
- Parkplatz: Selaflex-Admin-Darstellung im neuen System; Vercel-Account-Trennung
  freiberuflich vs. Cubintec; Supabase-Projekttransfer in Cubintec-Org; spaeter
  PROD->DEV-Resync der Stammdaten.
