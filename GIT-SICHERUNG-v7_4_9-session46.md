# GIT-SICHERUNG Session 46

**Datum:** 29. Mai 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v4.94
**PROD-Stand:** TimesheetForm v7.4.6-19, BerichtePage v7.4.6-16, FirmaCockpit v7.4.9-29

---

## Zusammenfassung

Session 46 hatte zwei kritische Bug-Fixes:

1. **Feiertage als Fehlzeiten:** Seit der Umstellung auf editierbare Fehlzeiten (v7.4.6-16,
   Session 38) wurden gesetzliche Feiertage nicht mehr automatisch in der S-Zeile
   (Sonstige bezahlte Ausfallzeiten) vorbelegt. Betroffen waren alle Monate ab Mai 2026
   (Tag der Arbeit, Christi Himmelfahrt, Pfingstmontag) sowie April 2026 (Ostern).
   Fix: Auto-Fill beim Laden der Zeiteintraege mit company.federal_state + holiday_region.

2. **Supabase 1000-Zeilen-Limit:** Supabase hat serverseitig ein Default Max-Rows von 1000.
   Bei Projekten mit >1000 Timesheet-Eintraegen (z.B. AS System HEATS: 4 MA x 13 Monate)
   wurden Daten stillschweigend abgeschnitten. Der Monatsverlauf-Chart zeigte Mai 2026
   nur 94h statt der tatsaechlichen ~500h. Fix: (a) .limit(10000) in allen 9 betroffenen
   Queries, (b) Supabase Max Rows auf 10000 in PROD und DEV erhoeht.

Zusaetzlich wurde eine Prozess-Checkliste (Smoke-Tests) als Pflichtenheft-Ergaenzung
formalisiert (Abschnitt 12b, Regel 11-13).

---

## Geaenderte Dateien

### Feiertags-Fix

| Datei | Version | Ziel | Aenderung |
|-------|---------|------|-----------|
| TimesheetForm-v7_4_6-19.tsx | 7.4.6-19 | src/components/shared/TimesheetForm.tsx | Feiertage automatisch in S-Zeile vorbelegen (loadTimeEntries), company in useEffect-Dependencies |

### Supabase Limit-Fix (.limit(10000) auf alle v7_timesheets-Queries)

| Datei | Version | Ziel | Aenderung |
|-------|---------|------|-----------|
| BerichtePage-v7_4_6-16.tsx | 7.4.6-16 | src/components/shared/BerichtePage.tsx | .limit(10000) + Diagnose-Logging |
| FirmaCockpit-v7_4_9-29.tsx | 7.4.9-29 | src/components/shared/FirmaCockpit.tsx | .limit(10000) |
| WorkPackageTable-v7_4_3-12.tsx | 7.4.3-12 | src/components/shared/WorkPackageTable.tsx | .limit(10000) |
| useBerichteData-v1_0_1.ts | 1.0.1 | src/hooks/useBerichteData.ts | .limit(10000) |
| timesheet-viewer-v7_4_0-9.tsx | 7.4.0-9 | src/app/v7/berater/timesheets/page.tsx | .limit(10000) |
| mein-status-page-v7_4_4-16.tsx | 7.4.4-16 | src/app/v7/firma/mein-status/page.tsx | .limit(10000) |
| berater-multiprojekt-detail-v7_4_8-13.tsx | 7.4.8-13 | src/app/v7/berater/multiprojekt/[id]/page.tsx | .limit(10000) (2 Queries) |
| berater-multiprojekt-page-v7_4_8-13.tsx | 7.4.8-13 | src/app/v7/berater/multiprojekt/page.tsx | .limit(10000) |

### Infrastruktur-Aenderungen (kein Code)

| Aenderung | Wert | Betrifft |
|-----------|------|----------|
| Supabase API Max Rows | 1000 -> 10000 | PZE-production + projektzeiterfassung20 (DEV) |

---

## Architektur-Entscheidungen Session 46

1. **Feiertags-Auto-Fill:** Beim Laden der Zeiteintraege werden Werktags-Feiertage
   (Mo-Fr, nicht Wochenende) automatisch in newAbsenceHours.S[tag] vorbelegt mit
   Tagesstunden (standard_weekly_hours / 5). Bereits manuell erfasste S-Werte werden
   NICHT ueberschrieben. Die company-Felder (federal_state, holiday_region,
   standard_weekly_hours) wurden in die useEffect-Dependencies aufgenommen.

2. **Supabase Max Rows:** Serverseitige Einstellung in Supabase Dashboard unter
   Settings > API > Max Rows. Zusaetzlich .limit(10000) im Code als doppelte Absicherung.
   WICHTIG: Bei jedem neuen Supabase-Projekt sofort Max Rows auf 10000 setzen.

3. **Diagnose-Logging:** BerichtePage v7.4.6-16 enthaelt temporaeres Console-Logging
   (DIAGNOSE-Tag). Wird in naechster Session entfernt.

---

## Neue Prozess-Regeln (aus Lessons Learned)

1. **Supabase Max Rows:** Bei Projektsetup sofort auf 10000 setzen (Default 1000 ist zu wenig)
2. **Code-Basis-Pruefung:** Vor jeder Aenderung aktuellste Version aus Projektverzeichnis
   pruefen, NICHT aus Kontext-Speicher arbeiten
3. **Smoke-Test nach Deploy:** Zeiterfassungs-Status vs. Arbeitsplan vergleichen,
   Monatsverlauf-Chart auf Plausibilitaet pruefen

---

## Offene Punkte fuer naechste Session

1. **Diagnose-Logging entfernen** (BerichtePage DIAGNOSE console.log)
2. **AP-Druck-Bug:** AP-Nummer erscheint doppelt, AP-Name abgeschnitten im PDF/Druck
3. ZA editing from Cockpit: clicking ZA number opens ZA directly
4. ProjektFortschrittPanel refactor zu projektfortschritt-utils
5. Standalone StundennachweisSeite und ProjektfortschrittSeite
6. Teilzeit-Historie (pWAZ changes over time) in MA-Modal
7. Employee login creation (aktuell nur via alte Mitarbeiterverwaltung)
8. Arbeitsplan Quick-View popup in TimesheetForm
9. Berater-Portal user manual (PDF)

---

## GIT-Sicherung Befehle

```bash
git checkout v7-dev
git add PFLICHTENHEFT-v4_94.md GIT-SICHERUNG-v7_4_9-session46.md
git commit -m "Session 46: Pflichtenheft v4.94 + GIT-Sicherung"
git push origin v7-dev
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
```
