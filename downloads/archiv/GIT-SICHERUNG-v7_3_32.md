# GIT-SICHERUNG v7.3.32

**Datum:** 20. Januar 2026  
**Stand:** v7.3.32  

---

## Änderungen seit v7.3.12

### Neue Seiten
- `page-firma-mitarbeiter-v7_3_21.tsx` - Mitarbeiter-Verwaltung im Firmen-Portal
- `page-firma-berichte-v7_3_19.tsx` - Berichte-Seite im Firmen-Portal

### Aktualisierte Seiten
- `v7-firma-dashboard-v7_3_27.tsx` - Grüner Header, UTF-8 korrigiert, Uhr-Emojis
- `v7-firma-detail-page-v7_3_32.tsx` - Ozeanblau Header (#0369a1), Projekt-Bearbeitung in Übersicht
- `page-firma-projekte-v7_3_26.tsx` - Förderformat-Liste erweitert, UTF-8 korrigiert

### Datenbank-Migrationen
- `v7-migration-hourly-rate-v7_3_20.sql` - Stundensatz in v7_project_assignments

### Dokumentation
- `PFLICHTENHEFT-v4_11.md` - Farbcode korrigiert, UTF-8 bereinigt

---

## Commit-Befehle

```bash
cd ~/documents/dev/pze

# Dateien ins Projekt kopieren
cp downloads/page-firma-mitarbeiter-v7_3_21.tsx src/app/v7/firma/mitarbeiter/page.tsx
cp downloads/page-firma-berichte-v7_3_19.tsx src/app/v7/firma/berichte/page.tsx
cp downloads/v7-firma-dashboard-v7_3_27.tsx src/app/v7/firma/page.tsx
cp downloads/page-firma-projekte-v7_3_26.tsx src/app/v7/firma/projekte/page.tsx
cp downloads/v7-firma-detail-page-v7_3_32.tsx "src/app/v7/berater/foerderung/firma/[id]/page.tsx"

# Git Commit
git add .
git commit -m "v7.3.32: Mitarbeiter/Berichte-Seiten, Header-Farben, UTF-8-Bereinigung

- Neue Seiten: Mitarbeiter-Verwaltung, Berichte im Firmen-Portal
- Förderformat-Liste erweitert (ZIM Einzel, ZIM Durchführbarkeitsstudie)
- Stundensatz nach v7_project_assignments verschoben
- Header-Farben korrigiert (Ozeanblau #0369a1, Grün #65A655)
- UTF-8-Fehler in allen Dateien bereinigt
- Projekt-Bearbeitung direkt in Übersicht möglich"

git push
```

---

## Versionsübersicht v7.3.20 - v7.3.32

| Version | Datei | Änderung |
|---------|-------|----------|
| v7.3.20 | v7-migration-hourly-rate | Stundensatz-Spalte in project_assignments |
| v7.3.21 | page-firma-mitarbeiter | Stundensatz-Hinweis entfernt |
| v7.3.22 | page-firma-projekte | Förderformat-Liste erweitert |
| v7.3.23 | v7-firma-detail-page | Förderformat-Liste Berater-Portal |
| v7.3.24 | v7-firma-detail-page | UTF-8 Korrektur |
| v7.3.25 | v7-firma-dashboard | UTF-8 Korrektur |
| v7.3.26 | page-firma-projekte | UTF-8 Korrektur |
| v7.3.27 | v7-firma-dashboard | Grüner Header, Uhr-Emojis |
| v7.3.28-30 | v7-firma-detail-page | Header-Korrekturen |
| v7.3.31 | v7-firma-detail-page | Projekt-Bearbeitung in Übersicht |
| v7.3.32 | v7-firma-detail-page | Ozeanblau #0369a1 |

---

## Farbschema (verbindlich)

| Portal | Farbe | Hex-Code |
|--------|-------|----------|
| Berater-Portal | Ozeanblau | `#0369a1` |
| Firmen-Portal | Cubintec-Grün | `#65A655` |

**Regel:** Header-Farbe zeigt "wer bin ICH" - nicht welche Daten angezeigt werden.

---

## Nächste Schritte

1. Option B: Projekt-Bearbeitungsmaske mit Tabs (Grunddaten / Antragsdaten)
2. ZIM PDF-Import für Projektdaten
3. Stundennachweis-Import

---

**Erstellt:** 20. Januar 2026
