# GIT-SICHERUNG Session 46

**Datum:** 29. Mai 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v4.95
**PROD-Stand:** TimesheetForm v7.4.6-20, BerichtePage v7.4.6-17, FirmaCockpit v7.4.9-29

---

## Zusammenfassung

Session 46 umfasste drei kritische Bug-Fixes, einen Druck-Fix und die Einrichtung
einer vollwertigen DEV-Testumgebung mit PROD-Daten.

1. **Feiertage als Fehlzeiten** (TimesheetForm v7.4.6-19/20): Seit Session 38 wurden
   Feiertage nicht mehr in der S-Zeile vorbelegt. Fix: Auto-Fill beim Laden.
2. **Supabase 1000-Zeilen-Limit** (8 Dateien + Infrastruktur): Default Max Rows
   kappte Timesheet-Queries. Fix: .limit(10000) + Supabase Settings auf 10000.
3. **AP-Name im Druck abgeschnitten** (TimesheetForm v7.4.6-20): line-clamp und
   maxWidth im Print aufgehoben, Select als statischer Text.
4. **DEV-Datensync**: Script sync-prod-to-dev-v2.mjs synchronisiert PROD-Daten
   nach DEV per direkter PostgreSQL-Verbindung. DEV und PROD jetzt 100% identisch.

---

## Geaenderte Dateien

### Code-Aenderungen (deployed auf PROD)

| Datei | Version | Ziel | Aenderung |
|-------|---------|------|-----------|
| TimesheetForm-v7_4_6-20.tsx | 7.4.6-20 | src/components/shared/TimesheetForm.tsx | Feiertags-Auto-Fill + AP-Druck-Fix |
| BerichtePage-v7_4_6-17.tsx | 7.4.6-17 | src/components/shared/BerichtePage.tsx | .limit(10000), Diagnose entfernt |
| FirmaCockpit-v7_4_9-29.tsx | 7.4.9-29 | src/components/shared/FirmaCockpit.tsx | .limit(10000) |
| WorkPackageTable-v7_4_3-12.tsx | 7.4.3-12 | src/components/shared/WorkPackageTable.tsx | .limit(10000) |
| useBerichteData-v1_0_1.ts | 1.0.1 | src/hooks/useBerichteData.ts | .limit(10000) |
| timesheet-viewer-v7_4_0-9.tsx | 7.4.0-9 | src/app/v7/berater/timesheets/page.tsx | .limit(10000) |
| mein-status-page-v7_4_4-16.tsx | 7.4.4-16 | src/app/v7/firma/mein-status/page.tsx | .limit(10000) |
| berater-multiprojekt-detail-v7_4_8-13.tsx | 7.4.8-13 | src/app/v7/berater/multiprojekt/[id]/page.tsx | .limit(10000) (2x) |
| berater-multiprojekt-page-v7_4_8-13.tsx | 7.4.8-13 | src/app/v7/berater/multiprojekt/page.tsx | .limit(10000) |

### Infrastruktur

| Aenderung | Wert | Betrifft |
|-----------|------|----------|
| Supabase API Max Rows | 1000 -> 10000 | PROD + DEV |
| DEV: v7_timesheet_completions | Tabelle angelegt | DEV |
| DEV: fehlende Spalten | zuwendungsbescheid_datum, Gehaltsdaten | DEV |
| DEV: 3 Extra-Unique-Indexes entfernt | wp_entry, absence_entry, nonbillable_entry | DEV |

### Neue Scripts

| Datei | Ziel | Funktion |
|-------|------|----------|
| sync-prod-to-dev-v2.mjs | scripts/ | PROD->DEV Datensync (PostgreSQL direkt) |

---

## DEV-Datensync Anleitung

1. DEV SQL-Editor: DO $$ Block mit session_replication_role = replica + DELETE
2. Terminal: node scripts/sync-prod-to-dev-v2.mjs (Keys, bestaetigen)
3. DEV SQL-Editor: user_profiles + consultant_access wiederherstellen
4. Gegencheck: Timesheet-Counts pro Projekt vergleichen

---

## Offene Punkte naechste Session

1. Verhaltensvertrag fuer kritische Komponenten
2. ZA-Bearbeitung im Cockpit
3. ProjektFortschrittPanel refactor
4. Standalone StundennachweisSeite/ProjektfortschrittSeite
5. Teilzeit-Historie im MA-Modal
6. Employee login creation
7. Berater-Portal user manual

---

## GIT-Sicherung Befehle

```bash
git checkout v7-dev
git add PFLICHTENHEFT-v4_95.md GIT-SICHERUNG-v7_4_9-session46.md
git commit -m "Session 46: Pflichtenheft v4.95 + GIT-Sicherung"
git push origin v7-dev
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
```
