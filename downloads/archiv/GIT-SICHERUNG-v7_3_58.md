# GIT-SICHERUNG V7.3.58

**Datum:** 21. Januar 2026  
**Branch:** v7-dev  
**Status:** Zeiterfassung als Shared Component

---

## Aenderungen in diesem Release

### Neue Shared Components

1. **TimesheetForm.tsx** (1386 Zeilen)
   - Pfad: `/src/components/shared/TimesheetForm.tsx`
   - Stundennachweis mit Excel-Navigation
   - PDF-Export, Feiertage pro Bundesland
   - Fehlzeiten (U/K/S)
   - Portal-spezifische Farben

2. **ProjectDetailPage.tsx** (1527 Zeilen) - AKTUALISIERT
   - Pfad: `/src/components/shared/ProjectDetailPage.tsx`
   - Zeiterfassung-Tab mit funktionierendem Button
   - Oeffnet Zeiterfassung mit Projekt vorausgewaehlt

### Portal-Seiten

3. **page.tsx** (Firma Zeiterfassung) (265 Zeilen)
   - Pfad: `/src/app/v7/firma/zeiterfassung/page.tsx`
   - URL-Parameter: `?projekt=<id>`

4. **page.tsx** (Berater Zeiterfassung) (267 Zeilen)
   - Pfad: `/src/app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx`
   - URL-Parameter: `?projekt=<id>`

---

## Git-Befehle

```bash
cd ~/Documents/Dev/PZE

# Status pruefen
git status

# Alle Aenderungen hinzufuegen
git add .

# Commit
git commit -m "v7.3.58: Zeiterfassung als Shared Component

- TimesheetForm: Stundennachweis fuer beide Portale
- Excel-Navigation (Pfeiltasten, Tab, Enter)
- PDF-Export mit Speicherdialog
- Feiertage pro Bundesland
- Fehlzeiten (U/K/S)
- ProjectDetailPage: Zeiterfassung-Tab mit Button
- URL-Parameter projekt=<id> fuer Vorauswahl
- Berater-Farbe korrigiert auf Sky-700 (#0369a1)"

# Push
git push origin v7-dev
```

---

## Vercel Deployment

Nach dem Push automatisch ueber Vercel oder manuell:

```bash
vercel --prod
```

---

## Dateien im Release

| Datei | Zeilen | Aenderung |
|-------|--------|-----------|
| TimesheetForm-v7_3_58.tsx | 1386 | NEU |
| ProjectDetailPage-v7_3_58.tsx | 1527 | Zeiterfassung-Link |
| page-firma-zeiterfassung-v7_3_58.tsx | 265 | NEU |
| page-berater-zeiterfassung-v7_3_58.tsx | 267 | NEU |
| deploy-v7_3_58.sh | 83 | Deploy-Script |
| PFLICHTENHEFT-v4_17.md | - | Dokumentation |

---

## Funktionale Aenderungen

### Zeiterfassung erreichbar ueber:

1. **Direkt-URL:**
   - Firma: `http://localhost:3000/v7/firma/zeiterfassung`
   - Berater: `http://localhost:3000/v7/berater/foerderung/firma/<ID>/zeiterfassung`

2. **Aus Projekt-Detail:**
   - Tab "Zeiterfassung" -> Button "Zeiterfassung oeffnen"
   - Projekt ist vorausgewaehlt

### Features:
- Mitarbeiter-Auswahl (Admin sieht alle)
- Projekt-Auswahl
- Monats-Navigation
- Stundeneingabe pro Tag/AP
- Fehlzeiten (U, K, S in Zellen eingeben)
- Speichern in Datenbank
- PDF-Export / Drucken

---

*Erstellt: 21. Januar 2026*
