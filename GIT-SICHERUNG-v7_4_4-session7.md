# GIT-Sicherung Session 7 - 22. Maerz 2026

## Status
- Branch: v7-dev + main deployed
- Production: pze.itenion.com
- Letzte Commits dieser Session: v7.4.3-9, v7.4.4-21

## Was in Session 7 erfolgreich deployed wurde

### 1. TimesheetForm-v7_4_3-9.tsx
**Ziel:** `src/components/shared/TimesheetForm.tsx`

**Fixes und neue Features:**
- **Komma-Dezimaltrennzeichen komplett:** parseHours() in ALLEN Berechnungsfunktionen
  (calculateRowSum, calculateDaySum, calculateTechnicalDaySum, calculateNonBillableSum)
  Vorher fehlte parseHours in calculateRowSum -> Zeilensumme vor Speichern falsch
- **Feiertags-Summe "Sonstige":** Feiertage werden jetzt korrekt in die Summen-Spalte
  der Fehlzeiten-Zeile eingerechnet (vorher nur Anzeige, nicht Summierung)
- **Mariae Himmelfahrt Bayern:** 15. August jetzt fuer DE-BY + DE-SL
- **normalizeStateCode():** DB speichert "Bayern" als Langname -> wird zu "DE-BY" konvertiert
- **companyDailyHours:** Tagesarbeitszeit aus standard_weekly_hours/5 (38h -> 7,6h)
- **"Monat abschliessen" Button:** Neuer Button ganz links im Header
  - Grau = offen, Gruen = abgeschlossen
  - Speichert in v7_timesheet_completions
  - Wird automatisch zurueckgesetzt wenn Aenderungen gespeichert werden
  - Laedt Status bei Monat/MA/Projekt-Wechsel aus DB
- **Button-Reihenfolge:** Monat abschliessen | Speichern | PDF Export | Drucken

### 2. FirmendatenCard-v7_4_4-2.tsx
**Ziel:** `src/components/shared/FirmendatenCard.tsx`
- Neues Feld "Regelarbeitszeit" in Anzeige und Bearbeiten-Modal
- Zeigt h/Woche und h/Tag aus standard_weekly_hours
- JSX-Struktur-Bug behoben (Regelarbeitszeit-Div war ausserhalb Grid)

### 3. berichte-page-v7_4_4-17.tsx
**Ziel:** `src/app/v7/firma/berichte/page.tsx`
- **Matrix-Ampel Vollstaendigkeitspruefung komplett ueberarbeitet:**
  - normalizeStateCode() fuer Feiertags-Berechnung
  - Mariae Himmelfahrt fuer DE-BY ergaenzt
  - Feiertage zaehlen als "erfasste Tage" (brauchen keinen DB-Eintrag)
  - Completion-Flag aus v7_timesheet_completions: Gruen wenn MA Monat abgeschlossen hat
- **completions State** und DB-Query in loadData

### 4. berater-berichte-page-v7_4_4-18.tsx
**Ziel:** `src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx`
- Identische Fixes wie berichte-page (normalizeStateCode, Feiertage, Completion)

### 5. WorkPackageEditModal-v7_3_85-2.tsx
**Ziel:** `src/components/shared/WorkPackageEditModal.tsx`
- Fix: `is_technical ae true` -> `is_technical as boolean`
  (Python-UTF-8-Bereinigung hatte "as" zu "ae" kaputt gemacht)

### 6. ZAPanel-v7_4_4-21.tsx
**Ziel:** `src/components/shared/ZAPanel.tsx`
- **ZIM_NETZWERK als gueltiges Foerderformat:** Filter war nur ZIM + ZIM_DS
  Cubintec YachtConnect hat funding_format = 'ZIM_NETZWERK' -> Panel renderte null
- **Filter jetzt:** ff.startsWith('ZIM') -> alle ZIM-Varianten unterstuetzt
- **Robuster Vergleich:** .toString().toUpperCase().trim() gegen Postgres ENUM-Typ

### 7. SQL-Migration (in Supabase Prod ausgefuehrt)
```sql
-- Neue Tabelle fuer Monats-Abschluss
CREATE TABLE v7_timesheet_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES v7_employees(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  completed_by UUID REFERENCES v7_user_profiles(id),
  UNIQUE(employee_id, project_id, year, month)
);
CREATE INDEX idx_v7_timesheet_completions_emp ON v7_timesheet_completions(employee_id);
CREATE INDEX idx_v7_timesheet_completions_proj ON v7_timesheet_completions(project_id);
ALTER TABLE v7_timesheet_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completions_select" ON v7_timesheet_completions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "completions_insert" ON v7_timesheet_completions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "completions_delete" ON v7_timesheet_completions FOR DELETE USING (auth.role() = 'authenticated');

-- Regelarbeitszeit in Unternehmensdaten
ALTER TABLE v7_client_companies ADD COLUMN standard_weekly_hours NUMERIC(4,1) DEFAULT 40.0;
UPDATE v7_client_companies SET standard_weekly_hours = 38.0 WHERE name = 'Cubintec GmbH';
UPDATE v7_employees SET weekly_hours = 38.0 WHERE email ILIKE '%ditscherlein%';
```

## Matrix-Ampel Logik (neue Regeln)
- **Gruen:** Monat wurde vom MA mit "Monat abschliessen" markiert
  ODER alle Arbeitstage haben Eintraege
- **Orange:** Eintraege vorhanden aber kein Abschluss-Flag
- **Rot:** Keine Eintraege
- **Grau:** Zukunft

## Wichtige Erkenntnisse dieser Session

### UTF-8 Bereinigung - KRITISCHE REGEL
Python-Script darf NIEMALS den gesamten Dateiinhalt durch ASCII-Filter jagen.
Folgendes zerstoert TypeScript/JSX:
- Template-Strings mit `${...}` werden beschaedigt
- CSS-in-JS Bloecke werden zerstoert  
- "as"-Casts werden zu "ae" (Umlaut-Ersetzung greift faelschlicherweise)
Korrekte Methode: Immer von Original-Datei starten, nur gezielte String-Ersetzungen.

### Bundesland-Normalisierung
DB speichert Bundesland als Langname ("Bayern"), Code braucht "DE-BY".
normalizeStateCode() muss in ALLEN Komponenten verwendet werden die Feiertage berechnen:
- TimesheetForm: getGermanHolidays(year, normalizeStateCode(company.federal_state))
- berichte-page: getGermanHolidays(y, normalizeStateCode(company?.federal_state))
- berater-berichte-page: identisch

### ZIM-Foerderformate
Bekannte Werte in v7_projects.funding_format:
- ZIM (Standard Einzelprojekt)
- ZIM_DS (Durchfuehrbarkeitsstudie)
- ZIM_NETZWERK (Netzwerkmanagement - Cubintec YachtConnect)
ZAPanel-Filter: ff.startsWith('ZIM') deckt alle Varianten ab.

### Monatsabschluss-Workflow
1. MA erfasst Stunden im TimesheetForm
2. MA klickt "Monat abschliessen" -> gruener Button, DB-Eintrag in v7_timesheet_completions
3. Falls MA nachtraegliche Aenderung speichert -> Completion automatisch geloescht
4. MA muss erneut "Monat abschliessen" klicken
5. Matrix-Ampel liest Completion-Flag -> Gruen

## Offene Punkte (naechste Session)

### Carry-over aus frueheren Sessions
- Firma-Detailseite Berater-Portal: Header noch gruen statt blau (Bug 5.9)
- ZA-Rollback-Button: Bewilligt -> Eingereicht (nur Bewilligt -> Entwurf vorhanden)
- Stundensatz-Diskrepanz Annika Arndt (20,19 vs. 20,35 EUR/h)
- ZA-Ampel Integration Berater-Dashboard
- User Manual Berater-Portal

### Neu vereinbart
- **ZIM-Netzwerk gestaffelte Foerderquoten:**
  Diskussion mit Katrin geplant (23. Maerz 2026)
  Vorgeschlagene Strategie: Tabelle v7_project_foerdersatz_stufen
  mit gueltig_von/gueltig_bis/foerdersatz pro Projekt
  Entscheidung: Option A (manuelle Phasen) oder Option B (automatisch aus Projektstart)

## Dateien in Downloads (Session 7)

| Dateiname | Ziel | Status |
|-----------|------|--------|
| TimesheetForm-v7_4_3-9.tsx | src/components/shared/TimesheetForm.tsx | deployed |
| FirmendatenCard-v7_4_4-2.tsx | src/components/shared/FirmendatenCard.tsx | deployed |
| WorkPackageEditModal-v7_3_85-2.tsx | src/components/shared/WorkPackageEditModal.tsx | deployed |
| berichte-page-v7_4_4-17.tsx | src/app/v7/firma/berichte/page.tsx | deployed |
| berater-berichte-page-v7_4_4-18.tsx | src/app/v7/berater/.../berichte/page.tsx | deployed |
| ZAPanel-v7_4_4-21.tsx | src/components/shared/ZAPanel.tsx | deployed |
| zeiterfassung-page-v7_3_93.tsx | src/app/v7/firma/zeiterfassung/page.tsx | deployed |
| berater-ze-seite-v7_4_0-3.tsx | src/app/v7/berater/.../zeiterfassung/page.tsx | deployed |

## Pflichtenheft
**Version:** 4.47
**Datei:** PFLICHTENHEFT-v4_47.md
