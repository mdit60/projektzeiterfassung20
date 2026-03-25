# GIT-SICHERUNG SESSION 8
**Datum:** 24. Maerz 2026
**Branch:** v7-dev (+ merge main)
**SW-Release:** V7.4.4

---

## Geaenderte Dateien

| Datei | Version | Aenderung |
|-------|---------|-----------|
| TimesheetForm | v7_4_3-9 -> v7_4_3-10 | Monatsabschluss-Reset nur bei tatsaechlichen Aenderungen (hasChanges) |
| ProjectDetailPage | v7_4_4-31 -> v7_4_4-32 | ArbeitsplanImport + Kein-Team-Hinweis nur fuer adminUser sichtbar |
| mein-status-page | v7_4_4-5 -> v7_4_4-6 -> v7_4_4-7 | Links auf neue Anleitungen PL + FA |

## Neue Dateien (public/manuals)

| Datei | Beschreibung |
|-------|-------------|
| PZE_Anleitung_Projektleiter.pdf | Neue vollstaendige Anleitung v2.0 (ersetzt Kurzanleitung) |
| PZE_Anleitung_Firmen-Administrator.pdf | Neue vollstaendige Anleitung v2.0 (ersetzt Schnellstart) |

## Geloeschte Dateien (public/manuals)

| Datei | Grund |
|-------|-------|
| PZE_Schnellstart_Firmen-Administrator.pdf | Ersetzt durch vollstaendige Anleitung v2.0 |

## Git-Commits dieser Session

- v7.4.4-32: ArbeitsplanImport nur fuer Admins sichtbar
- v7.4.4-6: Anleitung Projektleiter Link aktualisiert
- v7.4.4: Anleitungen PL + FA v2.0 hinzugefuegt
- v7.4.4-7: Admin-Link auf neue Anleitung Firmen-Administrator

---

## Schwerpunkt Session 8: Dokumentation

### Neue Anleitungen erstellt

**PZE-Anleitung-Projektleiter-v2.0:**
- Vollstaendige Neuerstellung (ersetzt Kurzanleitung v1.0 vom Feb 2026)
- Alle neuen Funktionen: ZA-Modul, Stundennachweis-Matrix, Monatsabschluss
- Abkuerzungsverzeichnis (PZE, ZA, AP, bWAZ, pWAZ, PT, FuE)
- Testbetrieb-Hinweis mit Ansprechpartner
- Word-TOC mit Verlinkung, echte Seitenzahlen im Footer

**PZE-Anleitung-Firmen-Administrator-v2.0:**
- Vollstaendige Neuerstellung (ersetzt Schnellstart v1.0 vom Feb 2026)
- Neue Struktur: Firmendaten + Mitarbeiter zuerst (globale Verwaltung)
- Ausfuehrliches Kapitel 4 Projekte mit Schritt-fuer-Schritt-Workflow
- Import-Verhalten erklaert (kein Auto-Delete, manuelle Pruefung empfohlen)
- Kapitel 7 Mitarbeiterverwaltung + Kapitel 8 Firmendaten als globale Punkte

### Code-Fixes

**TimesheetForm v7.4.3-10:**
- Monatsabschluss wird nur zurueckgesetzt wenn hasChanges === true
- Vorher: Reset bei JEDEM Speichern (auch ohne Aenderungen)

**ProjectDetailPage v7.4.4-32:**
- ArbeitsplanImport (Excel Download/Upload) nur noch fuer client_admin sichtbar
- Projektleiter und Mitarbeiter sehen Arbeitsplan nur lesend

---

**Ende GIT-Sicherung Session 8**
