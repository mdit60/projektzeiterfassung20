# GIT-SICHERUNG SESSION 29
**Datum:** 24. April 2026
**Version:** v7.4.9
**Status:** Vollstaendig abgeschlossen, alles in PROD

---

## ERLEDIGTE AUFGABEN

### 1. Git-Synchronisation
- v7-dev war hinter main zurueckgefallen (Session-28-Commit nur auf main)
- Behoben mit: `git fetch origin && git rebase origin/main`
- Danach: `git push origin v7-dev`
- Ergebnis: v7-dev, origin/v7-dev und main alle auf `c0b24ff feat(v7.4.9)`

### 2. PROD-Migration NWM-Tabellen
**Ausgefuehrt in Supabase PROD (PZE-production):**
- `migration_nwm_foerderzeitraeume_v7_4_9.sql` -- Tabellen + RLS + Foerderzeitraeume
- `migration_nwm_komplett_final.sql` -- AP-Planung Yacht Connect

**Ergebnis PROD:**
- `v7_nwm_foerderzeitraeume`: 2 Eintraege (Jahr 1 + Jahr 2)
- `v7_nwm_ap_planung`:
  - Jahr 1 (70%, 01.08.2025-31.07.2026): 35 Eintraege / 19.45 PM
  - Jahr 2 (50%, 01.08.2026-31.07.2027): 28 Eintraege / 12.622 PM
- UUIDs aus PROD→DEV-Kopie identisch -- kein manuelles Mapping noetig

### 3. Duplikate v7_timesheets PROD bereinigt
**Ursache:** `fix_prod_export.py` wurde mehrfach gegen PROD ausgefuehrt
(22. April 12:06 und 23. April 08:04 Uhr), kein ON CONFLICT-Schutz vorhanden.

**Analyse:**
- 16 betroffene Mitarbeiter, bis zu 8 Duplikate pro Tag
- Unterscheidung: echte Duplikate (gleiche AP + Stunden) vs. legitime
  Mehrfachbuchungen (gleicher Tag, verschiedene APs oder Stunden)

**Bereinigung:**
- Script: `cleanup_timesheets_duplikate_prod.sql`
- Logik: behalte aeltesten Eintrag (MIN created_at) pro
  employee_id + project_id + work_date + work_package_id + hours
- Ergebnis: 60 echte Duplikate geloescht, keine Datenverluste
- Kontrolle (Schritt 4): "No rows returned" -- sauber

### 4. FZul-Testprojekt geloescht
- Gefunden in `v7_fzul_vorhaben` (nicht in `v7_projects`!)
- ID: `4fde672c-3ac5-4c3d-b77f-bbe85be9960a`
- Titel: "Entwicklung eines KI-gestuetzten Systems zur Erfassung von
  Refit-geeigneten Booten im Lagersbestand von Werften"
- Firma: AS System, Wirtschaftsjahr 2026, Status: Entwurf
- In PROD geloescht

### 5. KPT: Frei-PM-Spalte ergaenzt
- `berater-multiprojekt-page-v7_4_8-5.tsx`
  → `src/app/v7/berater/multiprojekt/page.tsx`
- Neue Spalte "Frei PM" neben bestehender "Frei h"-Spalte
- Formel: `gesamtFrei / 173.33`, gerundet auf 2 Dezimalstellen
- Gleiche Farblogik wie "Frei h" (gruen > 0, rot = 0)
- In PROD deployed, getestet, live

---

## AKTUELLE VERSIONSNUMMERN

| Datei | Version | Pfad | Status |
|-------|---------|------|--------|
| berater-multiprojekt-page | v7.4.8-5 | src/app/v7/berater/multiprojekt/page.tsx | PROD |
| berater-multiprojekt-detail | v7.4.8-12 | src/app/v7/berater/multiprojekt/[id]/page.tsx | PROD |
| berater-dashboard | v7.4.4-13 | src/app/v7/berater/dashboard/page.tsx | PROD |
| ProjectDetailPage | v7.4.4-54 | src/components/shared/ProjectDetailPage.tsx | PROD |
| WorkPackageTable | v7.4.3-11 | src/components/shared/WorkPackageTable.tsx | PROD |
| v7-types | v7.4.8-1 | src/lib/v7-types.ts | PROD |
| v7-module-config | v7.3.90-7 | src/lib/v7-module-config.ts | PROD |

---

## OFFENE PUNKTE FUER SESSION 30

**Prioritaet 1 -- Unique Constraint v7_timesheets:**
- Verhindert kuenftige Duplikate durch fehlenden DB-Schutz
- Constraint auf (employee_id, project_id, work_date, work_package_id)
- Muss sorgfaeltig geplant werden (bestehende legitime Mehrfachbuchungen
  auf verschiedene APs am gleichen Tag sind erlaubt!)

**Prioritaet 2 -- GIT-Sicherung + Pflichtenheft:**
- GIT-Sicherung Session 29 ins Repo pushen (diese Datei)
- Pflichtenheft v4.72 ins Repo pushen

**Prioritaet 3 -- KPT Erweiterungen:**
- NWM-Arbeitsplan: Excel-Import fuer beide Jahre
- KPT: Planungshorizont dynamisch aus Projektlaufzeiten
- KPT: Tooltip-Erweiterung fuer NWM-Projekte

**Prioritaet 4 -- Benutzerdokumentation:**
- Benutzerhandbuch Berater-Portal (noch nicht erstellt)
- Benutzerhandbuch PL + Admin aktualisieren (v2.0 veraltet)

---

## WICHTIGE DB-INFOS

**DEV:** projektzeiterfassung20
- db.jaiyycmstgepxaqsvnjd.supabase.co
- Cubintec consultant_company_id: `4f20d4bc-588d-4291-bc0b-995943533829`
- Martin DEV user_id: `3f523c02-d422-48c2-9b18-4d9af3b725bd`

**PROD:** PZE-production
- db.cnnuyioklhlrfygwticf.supabase.co
- Cubintec consultant_company_id: `db94308e-f2d0-447b-8b67-96a4f4ef3d15`

**NWM Yacht Connect:**
- Projekt-ID: `5d73f3d3-b6c5-4368-b753-1dcf38c16102`
- Foerderkennzeichen: 16KN124502
- Foerderquoten: Jahr 1=70%, Jahr 2=50%
- Foerderzeitraum-ID Jahr 1: `a1000001-0000-0000-0000-000000000001`
- Foerderzeitraum-ID Jahr 2: `a1000001-0000-0000-0000-000000000002`

---

## LERNPUNKTE SESSION 29

- `v7_fzul_vorhaben` ist eine eigenstaendige Tabelle (nicht `v7_projects`)
  -- FZul-Vorhaben im MPT werden dort gespeichert, Spalte heisst `title`
- `MIN(id)` funktioniert nicht auf UUID-Spalten in Supabase/PostgreSQL
  -- Alternative: `MIN(created_at)` als Vergleichskriterium verwenden
- PROD→DEV-Datenkopie mit Import-Script ohne ON CONFLICT kann Duplikate
  erzeugen wenn das Script mehrfach ausgefuehrt wird -- kuenftig absichern

---

## GIT-WORKFLOW SESSION 29
```bash
cd ~/Documents/Dev/PZE
git add -A
git commit -m "docs: GIT-Sicherung Session 29 + Pflichtenheft v4.72"
git push origin v7-dev
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
```
