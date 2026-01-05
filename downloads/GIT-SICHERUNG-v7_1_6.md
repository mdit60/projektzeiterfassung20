# GIT-SICHERUNG v7.1.6

**Datum:** 03. Januar 2026  
**Branch:** v7-dev  
**Status:** MA-AP-Zuordnung komplett

---

## Zusammenfassung

Diese Session hat die komplette CRUD-Funktionalität für die Firmen-Detailseite implementiert, inklusive Zuordnung von Mitarbeitern zu Projekten und Arbeitspaketen mit PM-Verteilung.

---

## Änderungen in dieser Session

### v7.1.3 - Firma/Projekt/MA CRUD
- Modal-Dialoge für Anlegen/Bearbeiten
- Hover-basierte Edit/Delete Buttons
- Soft-Delete (is_active = false)
- Duplikat-Prüfung bei MA (Email)

### v7.1.4 - Arbeitspakete CRUD
- Auto-Inkrement AP-Nummer pro Projekt
- PM↔Stunden Umrechnung (HOURS_PER_PM = 173.33)
- Projekt-Dropdown bei Anlage

### v7.1.5 - MA zu Projekt zuordnen
- Anzeige zugeordneter MA in Projekt-Karte (Badges)
- Modal mit zwei Listen: Zugeordnet / Verfügbar
- Hinzufügen/Entfernen per Klick

### v7.1.6 - MA zu AP zuordnen mit PM
- Purple Badges mit MA-Name + PM
- PM-Eingabefeld pro MA
- Überbucht-Warnung wenn PM > AP-Gesamt
- Nur Projekt-MA können AP zugeordnet werden

### Cache-Kontrolle
- next.config.ts mit no-cache Headers für /v7/*

---

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/app/v7/berater/foerderung/firma/[id]/page.tsx` | Komplett überarbeitet (v7.1.6) |
| `next.config.ts` | Cache-Header hinzugefügt |

---

## Datenbank-Stand

Migration v7-migration-workpackages-v7.sql wurde ausgeführt:
- 50 Arbeitspakete migriert
- 117 AP-Zuordnungen migriert
- MA-Mapping via Email

---

## Git Commits (empfohlen)

```bash
git add .
git commit -m "v7.1.6: MA-AP-Zuordnung mit PM-Verteilung"
git tag v7.1.6-dev
git push origin v7-dev --tags
```

---

## Nächste Schritte (Phase 3)

1. FZul-Editor V6→V7 Migration
2. FZul-Import
3. FZul-Archiv

---

## Dateien zum Download

- `v7-firma-detail-page-v5.tsx` → nach `src/app/v7/berater/foerderung/firma/[id]/page.tsx`
- `next.config.ts` → Projektwurzel
- `PFLICHTENHEFT-v4_4.md` → Dokumentation

---

**Session-Ende:** 03.01.2026
