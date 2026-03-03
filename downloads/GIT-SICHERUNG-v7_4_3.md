# GIT-SICHERUNG PZE v7.4.3

**Datum:** 03. Maerz 2026
**SW-Release:** V7.4.3-11
**Pflichtenheft:** v4.38

## Geaenderte Dateien

| Datei | Version | Pfad | Aenderung |
|-------|---------|------|-----------|
| berichte-page | v7.4.3-11 | src/app/v7/firma/berichte/page.tsx | is_active/is_billable Fix, work_package_assignments, Doppelbalken, Stunden-Status, portalRole |
| berater-berichte-page | v7.4.3-11 | src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx | Gleichgezogen mit Firmen-Portal |
| WorkPackageTable | v7.4.3-7 | src/components/shared/WorkPackageTable.tsx | Ampel-Farblogik (Orange BG Erfasst, Rot Text Frei) |
| TimesheetForm | v7.4.3-4 | src/components/shared/TimesheetForm.tsx | AP Pre-Population Timing Fix |
| mein-status-page | v7.3.95-5 | src/app/v7/firma/mein-status/page.tsx | FAQ Download Link |
| PZE-FAQ-Zeiterfassung-v1.pdf | v1 | public/manuals/ | FAQ PDF mit Logo, Header, Footer, TOC |
| PZE-FAQ-Zeiterfassung-v1.docx | v1 | public/manuals/ | FAQ DOCX mit Logo, Header, Footer, TOC |
| PFLICHTENHEFT | v4.38 | Dokumente/ | Aktualisiert mit v7.4.3 Features und Bugs |

## Deployment Status

| Branch | Status | Vercel |
|--------|--------|--------|
| v7-dev | Aktuell | Auto-Deploy aktiv |
| main   | Aktuell | Customer-Test |

## Zusammenfassung Session 03.03.2026

1. TimesheetForm v7.4.3-4: AP-Pre-Population mit setTimeout
2. WorkPackageTable v7.4.3-7: Farblogik (Orange=Warnung Erfasst, Rot=Ueberschritten Frei)
3. FAQ Zeiterfassung v1: PDF/DOCX mit Cubintec-Logo, 7 Kapitel
4. Mein Status v7.3.95-5: FAQ Download-Link
5. Berichte Firmen-Portal v7.4.3-8 bis -11: Komplett ueberarbeitet
6. Berater-Berichte v7.4.3-11: Alle Fixes auf Berater-Portal uebertragen
