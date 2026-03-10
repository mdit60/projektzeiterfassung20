# GIT-SICHERUNG v7.4.3-19
**Datum:** 09. Maerz 2026
**Branch:** v7-dev (deployed) + main (deployed)
**Live-URL:** https://pze.itenion.com

---

## Aktueller Stand

### Deployed auf v7-dev UND main:
- v7.4.3-12: Stundennachweis-Matrix in Berichte (Firma + Berater)
- v7.4.3-13 bis -19: Personalkosten Excel-Export (Kachel 1)

---

## Geaenderte Dateien dieser Session (v7.4.3-12 bis -19)

### Firmen-Portal Berichte
```
src/app/v7/firma/berichte/page.tsx
  -> Quelle: berichte-page-v7_4_3-19.tsx
  -> Deployed: v7-dev + main
```

### Berater-Portal Berichte
```
src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx
  -> Quelle: berater-berichte-page-v7_4_3-12.tsx
  -> Deployed: v7-dev + main
```

---

## Was in v7.4.3-12 bis -19 gebaut wurde

### Stundennachweis-Matrix (v7.4.3-12)
- Kachel "Stundennachweis" aktiv in Firma + Berater-Portal
- Aufklappbare Matrix MA x Projektmonat
- Ampelfarben: gruen/orange/rot/grau
- Klick navigiert direkt zur Zeiterfassung des MA/Monats mit returnUrl

### Personalkosten Excel-Export (v7.4.3-13 bis -19)
- Kachel "Personalkosten" aktiv (gruen)
- Klick oeffnet Inline-Panel mit Von/Bis Datumsfeldern
- Default: Projektstart bis heute
- Export als echte .xlsx-Datei (xlsx npm-Paket v0.18.5)
- Sheet 1 "Personalkosten": MA-Liste mit Stunden, Stundensatz, Kosten
  gefiltert auf gewaehlten Abrechnungszeitraum
- Sheet 2 "Jahresscheiben (Anlage 5)": PM je Projektjahr anteilig
- Spaltenbreiten gesetzt
- Build-Probleme auf dem Weg:
  - v7.4.3-13: CDN-Import xlsx crashte Vercel Webpack -> auf npm umgestellt
  - v7.4.3-14/15: SpreadsheetML erzeugte Excel-Warning -> auf xlsx gewechselt
  - v7.4.3-16: CSV-Zwischenloesung (eine Datei)
  - v7.4.3-17: Echter XLSX Export nach Bestaetigung xlsx in package.json
  - v7.4.3-18: Zeitraum-Filter eingebaut, Syntax-Fehler im Build
  - v7.4.3-19: Bereinigung, sauber deployed

---

## Git-Befehle fuer naechste Session

```bash
cd ~/Documents/Dev/PZE
git branch --show-current   # muss: v7-dev

# Statuscheck
git status
git log --oneline -10
```

---

## Naechste Aufgaben (v7.4.4)

### Prioritaet 1: ZA-Modul (Kachel 4 in Berichte)

**Schritt 1: SQL-Migration** (im Supabase SQL-Editor ausfuehren)
```sql
-- Neue Felder in v7_projects
ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS foerdersatz     NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS overhead_t      NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS overhead_nt     NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS overhead_gleich BOOLEAN DEFAULT false;

-- Neue Tabelle fuer ZA-Verwaltung
CREATE TABLE IF NOT EXISTS v7_zahlungsanforderungen (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id             UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,
  za_nummer              INTEGER NOT NULL,
  zeitraum_von           DATE NOT NULL,
  zeitraum_bis           DATE NOT NULL,
  auftraege_dritte       NUMERIC(12,2) DEFAULT 0,
  fue_unterauftrag       NUMERIC(12,2) DEFAULT 0,
  zeitw_personalaufnahme NUMERIC(12,2) DEFAULT 0,
  status                 TEXT DEFAULT 'entwurf',
  notizen                TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, za_nummer)
);

CREATE INDEX IF NOT EXISTS idx_v7_za_project ON v7_zahlungsanforderungen(project_id);
```

**Schritt 2: ProjectDetailPage/-CreateForm**
- Neue Felder: Foerdersatz (%), Overhead T (%), Overhead NT (%), T=NT Toggle
- Datei: ProjectDetailPage-v7_4_3-88-7.tsx -> neue Version

**Schritt 3: ZA-Kachel (Berichte-Seite)**
- Kachel 4 "Zahlungsanforderung" aktivieren
- 3-Tab-Dialog: Deckblatt / Anlage 1a / Anlage 1b
- Formulartyp: ZIM (eine Spalte) vs ZIM_DS (T/NT getrennt)
- Details: PFLICHTENHEFT-v4_40.md Abschnitt 7.27

### Prioritaet 2: Sonstiges
- Timesheet-Viewer Berater-Portal weiter ausbauen
- User Manual Berater-Portal

---

## Bekannte Formular-Unterschiede ZIM vs DS

| Merkmal | ZIM Einzelprojekt | ZIM DS |
|---------|-------------------|--------|
| Personal | eine Spalte | T + NT getrennt |
| Overhead | ein Satz % | T-Satz + NT-Satz getrennt |
| Auftraege Dritte | eine Zeile | T + NT getrennt |
| Anlage 1a Spalten | 1 (Stunden) | 2 (T / NT) |
| Anlage 1b Spalten | 1 Stundensatz | 1 Stundensatz, Kosten T/NT |
| Formular-Version | Stand 06.06.2025 | Stand 10.06.2025 |
| Seitenanzahl | 8 Seiten (mit QR) | 7 Seiten |

---

## Offene Fragen / Klaerungsbedarf

- funding_format fuer DS-Projekte: Aktuell 'ZIM' - soll 'ZIM_DS' werden?
  -> Muss beim naechsten Projekt-Anlegen geprueft werden
- Fördersatz bei DigiTrans und anderen Kunden: 45%? Projektspezifisch?
- Overhead-Sätze: Werden die aus dem Bewilligungsbescheid entnommen?
  -> Einmalig pro Projekt, aendern sich nicht
- ZA-Nummern: Starten bei 1 und laufen seriell je Projekt

---

## Systemstatus

| Komponente | Status |
|------------|--------|
| v7-dev Branch | Deployed, gruen |
| main Branch | Deployed, gruen (pze.itenion.com) |
| Supabase Dev-DB | Aktiv |
| Supabase Prod-DB | Noch nicht vollst. eingerichtet |
| Vercel | Auto-deploy aus v7-dev |

**Ende GIT-Sicherung v7.4.3-19**
