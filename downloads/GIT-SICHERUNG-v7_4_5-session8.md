# GIT-Sicherung Session 8 - 26. Maerz 2026 (aktualisiert)

## Status
- Branch: v7-dev + main deployed
- Production: pze.itenion.com
- Letzte Version dieser Session: v7.4.5-1 (ProjektFortschrittPanel) / v7.4.4-18 (berichte-page)

## Was in Session 8 erfolgreich deployed wurde

### 1. TimesheetForm-v7_4_3-12/13.tsx
**Ziel:** `src/components/shared/TimesheetForm.tsx`

- v7.4.3-12: PDF-Export Fix (window.print() im gleichen Tab)
- v7.4.3-13: NEU: Schutz abgeschlossener Monate
  - MA/Projektleiter: readonly bei isCompleted, Speichern ausgeblendet
  - Admin/Berater: amber Banner + Abschluss aufheben moeglich
  - canEdit() Guard fuer alle Zellen

### 2. ZAPanel-v7_4_4-22.tsx
**Ziel:** `src/components/shared/ZAPanel.tsx`

- NEU: ZIM_NETZWERK-Erweiterungen im Deckblatt
- Laufzeitjahr automatisch aus bewilligung_datum
- Foerdersatz automatisch aus foerdersatz_stufen JSONB
- NWM-Kostentabelle: Personalkosten (aus ZE), Auftraege Dritte, Uebrige

### 3. SQL-Migration NWM-Modul
**Datei:** migration_nwm_modul_v7_4_5.sql
**Status:** In DEV und PROD ausgefuehrt

Neue Felder in v7_projects:
- netzwerk_typ, netzwerk_phase, bewilligung_datum, phase2_start_datum
- foerdersatz_stufen (JSONB), nwm_bank_*, nwm_ust_id
- nwm_rechnung_prefix, nwm_rechnung_naechste, nwm_faelligkeitsfrist

Neue Tabellen:
- v7_netzwerk_partner (DISABLE ROW LEVEL SECURITY)
- v7_netzwerk_eigenanteile (DISABLE ROW LEVEL SECURITY)

Neue Tabelle manuell angelegt:
- v7_timesheet_completions (DISABLE ROW LEVEL SECURITY)
  Felder: employee_id, project_id, year, month, completed_at, completed_by

### 4. ProjectDetailPage-v7_4_4-32 bis -38.tsx
**Ziel:** `src/components/shared/ProjectDetailPage.tsx`

- v7.4.4-32: KISS Tab-Switch, Netzwerk-Tab, NWM-Sub-Tabs
- v7.4.4-33: NWMPartnerPanel eingebunden
- v7.4.4-34: consultantCompanyId weitergegeben
- v7.4.4-35: NWMEinstellungenPanel eingebunden
- v7.4.4-36: NWMEigenanteilPanel eingebunden
- v7.4.4-37: FIX Project Interface NWM-Bankfelder
- v7.4.4-38: NEU nwmTab URL-Parameter fuer Direktlinks

### 5. NWMPartnerPanel-v7_4_5-1 bis -4.tsx
**Ziel:** `src/components/shared/NWMPartnerPanel.tsx`

- v7.4.5-1: Grundimplementierung (Smart-Quoten, Austritt-Dialog)
- v7.4.5-2: Kundenauswahl-Dropdown im Modal
- v7.4.5-3: Alle Kundenfelder + Rechtsform-Erkennung
- v7.4.5-4: FIX Gleichverteilung nach NP-Hinzufuegen

### 6. NWMEinstellungenPanel-v7_4_5-1.tsx
**Ziel:** `src/components/shared/NWMEinstellungenPanel.tsx`

- Anzeige + Bearbeiten aller NWM-Einstellungen
- Foerdersatz-Stufen automatisch berechnet (manuell ueberschreibbar)
- Bankdaten, USt-ID, Rechnungsnummern-Konfiguration mit Live-Vorschau

### 7. NWMEigenanteilPanel-v7_4_5-1 bis -11.tsx
**Ziel:** `src/components/shared/NWMEigenanteilPanel.tsx`

- v7.4.5-1: Grundimplementierung (Quartal, Berechnung, PDF)
- v7.4.5-2/3: Perioden ab Projektstart (3-Monats-Rhythmus)
- v7.4.5-4: FIX ZE-Query auf work_date/hours Struktur
- v7.4.5-5: FIX Perioden-Datum Off-by-one
- v7.4.5-6: Cent-genaue Betragsverteilung
- v7.4.5-7: Von/Bis frei waehlbar
- v7.4.5-8/9: Intelligenter Periodenvorschlag ab letzter EA
- v7.4.5-10: Archiv-Tab alle EA-Perioden
- v7.4.5-11: Loeschen-Funktion im Archiv

### 8. EmployeeManagement-v7_3_95-2.tsx
**Ziel:** `src/components/shared/EmployeeManagement.tsx`

- NEU: Passwort zuruecksetzen fuer MA mit Login (amber Schluessel-Icon)
- Modal mit neuem Passwort, Erfolgs-Bestaetigung

### 9. mein-status-page-v7_4_4-8.tsx
**Ziel:** `src/app/v7/firma/mein-status/page.tsx`

- FIX: Completion-Flag als primaerer Monatsstatus (grueen wenn abgeschlossen)
- Laedt v7_timesheet_completions und priorisiert dieses Flag

### 10. berater-netzwerk-page-v7_4_5-1.tsx
**NEU:** `src/app/v7/berater/netzwerk/page.tsx`

- Neue NWM-Uebersichtsseite im Berater-Portal
- Liste aller ZIM_NETZWERK-Projekte aller Kunden
- Live-Daten: Anzahl NP, offene EA
- Klick: Auswahlmenue Einstellungen / Partner / Eigenanteile
- Direktlink zum Gesamtprojekt

### 11. berater-dashboard-v7_4_4-6.tsx
**Ziel:** `src/app/v7/berater/dashboard/page.tsx`

- Komplett neu: 4 Hauptkacheln statt Kundenliste
- Kundenfirmen -> /v7/berater/foerderung
- Netzwerkmanagement -> /v7/berater/netzwerk (Live: NWM-Anzahl + offene EA)
- Multiprojekt-Tool: in Vorbereitung
- Forschungszulage: in Vorbereitung

### 12. v7-module-config-v7_3_90-6.ts
**Ziel:** `src/lib/v7-module-config.ts`

- NWM-Kachel: status 'active', href '/v7/berater/netzwerk'

---

## DB-Fixes (direkt in Supabase Prod)

### v7_user_profiles: Lisa Kirchner
```sql
UPDATE v7_user_profiles SET
  first_name = 'Lisa', last_name = 'Kirchner',
  display_name = 'Kirchner, Lisa',
  client_company_id = (SELECT id FROM v7_client_companies WHERE name ILIKE '%Cubintec%' LIMIT 1)
WHERE id = 'fe15982f-1a2b-43e6-9347-4ac42472c69c';
```

### v7_timesheet_completions Tabelle
Manuell angelegt (fehlte in Schema):
```sql
CREATE TABLE IF NOT EXISTS v7_timesheet_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES v7_employees(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  completed_by UUID REFERENCES v7_user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT v7_timesheet_completions_unique
    UNIQUE(employee_id, project_id, year, month)
);
ALTER TABLE v7_timesheet_completions DISABLE ROW LEVEL SECURITY;
```

---

## Dateien in Downloads (Session 8 - komplett)

| Dateiname | Ziel | Status |
|-----------|------|--------|
| TimesheetForm-v7_4_3-12.tsx | src/components/shared/TimesheetForm.tsx | deployed |
| TimesheetForm-v7_4_3-13.tsx | src/components/shared/TimesheetForm.tsx | deployed |
| ZAPanel-v7_4_4-22.tsx | src/components/shared/ZAPanel.tsx | deployed |
| migration_nwm_modul_v7_4_5.sql | Supabase DEV + PROD | ausgefuehrt |
| ProjectDetailPage-v7_4_4-32.tsx | src/components/shared/ProjectDetailPage.tsx | deployed |
| ProjectDetailPage-v7_4_4-33.tsx | src/components/shared/ProjectDetailPage.tsx | deployed |
| ProjectDetailPage-v7_4_4-34.tsx | src/components/shared/ProjectDetailPage.tsx | deployed |
| ProjectDetailPage-v7_4_4-35.tsx | src/components/shared/ProjectDetailPage.tsx | deployed |
| ProjectDetailPage-v7_4_4-36.tsx | src/components/shared/ProjectDetailPage.tsx | deployed |
| ProjectDetailPage-v7_4_4-37.tsx | src/components/shared/ProjectDetailPage.tsx | deployed |
| ProjectDetailPage-v7_4_4-38.tsx | src/components/shared/ProjectDetailPage.tsx | deployed |
| NWMPartnerPanel-v7_4_5-1.tsx | src/components/shared/NWMPartnerPanel.tsx | deployed |
| NWMPartnerPanel-v7_4_5-2.tsx | src/components/shared/NWMPartnerPanel.tsx | deployed |
| NWMPartnerPanel-v7_4_5-3.tsx | src/components/shared/NWMPartnerPanel.tsx | deployed |
| NWMPartnerPanel-v7_4_5-4.tsx | src/components/shared/NWMPartnerPanel.tsx | deployed |
| NWMEinstellungenPanel-v7_4_5-1.tsx | src/components/shared/NWMEinstellungenPanel.tsx | deployed |
| NWMEigenanteilPanel-v7_4_5-1.tsx | src/components/shared/NWMEigenanteilPanel.tsx | deployed |
| NWMEigenanteilPanel-v7_4_5-2.tsx | src/components/shared/NWMEigenanteilPanel.tsx | deployed |
| NWMEigenanteilPanel-v7_4_5-3.tsx | src/components/shared/NWMEigenanteilPanel.tsx | deployed |
| NWMEigenanteilPanel-v7_4_5-4.tsx | src/components/shared/NWMEigenanteilPanel.tsx | deployed |
| NWMEigenanteilPanel-v7_4_5-5.tsx | src/components/shared/NWMEigenanteilPanel.tsx | deployed |
| NWMEigenanteilPanel-v7_4_5-6.tsx | src/components/shared/NWMEigenanteilPanel.tsx | deployed |
| NWMEigenanteilPanel-v7_4_5-7.tsx | src/components/shared/NWMEigenanteilPanel.tsx | deployed |
| NWMEigenanteilPanel-v7_4_5-8.tsx | src/components/shared/NWMEigenanteilPanel.tsx | deployed |
| NWMEigenanteilPanel-v7_4_5-9.tsx | src/components/shared/NWMEigenanteilPanel.tsx | deployed |
| NWMEigenanteilPanel-v7_4_5-10.tsx | src/components/shared/NWMEigenanteilPanel.tsx | deployed |
| NWMEigenanteilPanel-v7_4_5-11.tsx | src/components/shared/NWMEigenanteilPanel.tsx | deployed |
| EmployeeManagement-v7_3_95-2.tsx | src/components/shared/EmployeeManagement.tsx | deployed |
| mein-status-page-v7_4_4-8.tsx | src/app/v7/firma/mein-status/page.tsx | deployed |
| berater-netzwerk-page-v7_4_5-1.tsx | src/app/v7/berater/netzwerk/page.tsx | deployed |
| berater-dashboard-v7_4_4-6.tsx | src/app/v7/berater/dashboard/page.tsx | deployed |
| v7-module-config-v7_3_90-6.ts | src/lib/v7-module-config.ts | deployed |
| ProjektFortschrittPanel-v7_4_5-1.tsx | src/components/shared/ProjektFortschrittPanel.tsx | deployed |
| berichte-page-v7_4_4-18.tsx | src/app/v7/firma/berichte/page.tsx | deployed (Code ok, Kachel zeigt noch Demnaechst - Bug offen) |

---

## Offene Punkte (naechste Session)

### Carry-over aus frueheren Sessions
- Firma-Detailseite Berater-Portal: Header gruen statt blau (Bug 5.9)
- ZA-Rollback-Button: Bewilligt -> Eingereicht
- Stundensatz-Diskrepanz Annika Arndt (20.19 vs. 20.35 EUR/h)

### NWM-Modul (getestet, produktiv mit YachtConnect)
- USt-Behandlung Option B mit Katrin bestaetigen
- Rechnungs-PDF und PT-Nachweis in Praxis testen
- Erste echte ZA-Periode (Aug-Okt 25) berechnen und einreichen

### Neue Features (priorisiert)
1. BUG: Projektfortschritt-Kachel zeigt "Demnaechst" trotz korrektem Code in Git (f0fc614)
   - Code deployed: showFortschritt State + AKTIV-Kachel vorhanden
   - recharts installiert, kein Build-Fehler
   - Naechste Session: DevTools Network-Tab pruefen, evtl. Next.js Build-Cache leeren
   - Trigger-Zeile am Ende von berichte-page entfernen: "// deploy trigger..."
2. berater-berichte-page analog aktualisieren (Fortschritt-Kachel)
3. Personalkosten Excel-Export (Berichte-Kachel)
4. Berater-Portal User Manual (PDF)

### Dashboard Berater
- Kundenfirmen-Seite (/v7/berater/foerderung): pruefe ob Filter nwm sinnvoll
- Multiprojekt-Tool: Konzept noch offen
- Forschungszulage-Kachel: Konzept noch offen

## Pflichtenheft
**Version:** 4.49
**Datei:** PFLICHTENHEFT-v4_49.md
