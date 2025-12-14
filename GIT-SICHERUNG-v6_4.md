# Git-Sicherung v6.4-stable

**Datum:** 15. Dezember 2024
**Tag:** v6.4-stable

## Enthaltene Komponenten

| Datei | Version | Status |
|-------|---------|--------|
| src/app/import/page.tsx | v6.3d | ✅ FZul-Editor + Speichern |
| src/app/api/fzul/pdf/route.ts | v2.1 | ✅ PDF-Generierung |

## Features

- ✅ Excel-Import (BMBF/KMU-innovativ)
- ✅ FZul MA-Stammdaten
- ✅ FZul Online-Editor (BMF-konform)
- ✅ Inline-Editing im Kalender
- ✅ Speichern in Datenbank
- ✅ PDF-Generierung (2 Seiten)
- ❌ ZIM-Import (noch nicht integriert)

## Wiederherstellung

Falls nötig:
```
git checkout v6.4-stable
```

Oder einzelne Datei:
```
git checkout v6.4-stable -- src/app/import/page.tsx
```
