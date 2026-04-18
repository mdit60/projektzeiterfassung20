# GIT-SICHERUNG Session 13 – 02. April 2026

## Branch: v7-dev (deployed + auf main gemergt)

## Erledigte Aufgaben

### 1. DB-Migration: Zuwendungsbescheid-Daten
- Neues Feld `bewilligte_summe NUMERIC(14,2)` in `v7_projects`
- `bewilligung_datum` war bereits vorhanden (aus NWM-Migration)
- `zuwendungsbescheid_datum` versehentlich angelegt und wieder gedroppt
- Migration in DEV + PROD erfolgreich ausgeführt
- Dateien: `migration_bescheid_PROD_v7_4_5.sql`

### 2. ProjectDetailPage-v7_4_4-40
- Edit-Modal: `max-w-xl` → `max-w-2xl` (breiter)
- Neue Zeile 1: Förderkennzeichen | Datum Zuwendungsbescheid
- Neue Zeile 2: Fördersatz (%) | Bewilligte Fördersumme (EUR)
- Übersichts-Anzeige: Zuwendungsbescheid-Block in Projektdetails
- Type, Interface, Init, Save: alle neuen Felder integriert

### 3. ZAPanel-v7_4_4-26
- Interface: `bewilligte_summe` + `bewilligung_datum` ergänzt
- Infoblock umstrukturiert:
  - Zeile 1: Förderkennzeichen | Bewilligte Fördersumme (grün)
  - Zeile 2: ZA-Nr. | Bescheid-Datum | Zeitraum von | bis

### 4. BerichtePage-v7_4_4-1 (Shared Component – NEU)
- Ersetzt berichte-page (Firma) + berater-berichte-page (Berater)
- Ein einziger Code für beide Portale
- `portal`-Parameter steuert Farben (grün/blau) und Navigation
- `clientCompanyId`: bei Firma aus UserProfil, bei Berater aus URL-Params
- Erfasste PM: `text-green-600` für beide Portale garantiert
- Wrapper-Dateien: berichte-page-firma-wrapper-27, berater-berichte-page-wrapper-24

### 5. tailwind.config.ts (NEU)
- Safelist für green + blue Klassen
- Verhindert Tailwind-Purging bei dynamisch genutzten Klassen

### 6. Pflichtenheft v4.56
- §12d: Technische Schuld Berichte als Shared Component → ERLEDIGT
- Änderungshistorie aktualisiert

## Deployments
- v7-dev: mehrere Commits
- main: gemergt und deployed auf pze.itenion.com

## Dateien (downloads)
- migration_bescheid_PROD_v7_4_5.sql
- ProjectDetailPage-v7_4_4-40.tsx → src/components/shared/ProjectDetailPage.tsx
- ZAPanel-v7_4_4-26.tsx → src/components/shared/ZAPanel.tsx
- berichte-page-v7_4_4-26.tsx → ERSETZT durch Wrapper
- BerichtePage-v7_4_4-1.tsx → src/components/shared/BerichtePage.tsx
- berichte-page-firma-wrapper-v7_4_4-27.tsx → src/app/v7/firma/berichte/page.tsx
- berater-berichte-page-wrapper-v7_4_4-24.tsx → src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx
- tailwind.config.ts → tailwind.config.ts
- PFLICHTENHEFT-v4_56.md

## Offene Punkte (nächste Session)
- ZAPanel: Direkter "Bewilligt → Eingereicht" Rollback-Button
- Berater-Portal Benutzerhandbuch
- Gestaffelte Förderquoten ZIM_NETZWERK
- NWM: Offene Zahlungen in Netto-EA + USt aufteilen
- RLS-Migration vollständig planen und ausführen
- Security Definer Views → SECURITY INVOKER (Teil RLS-Plan)

## Lernpunkte Session 13
- KRITISCH: Nach jedem git push v7-dev IMMER sofort main mergen
  git checkout main && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
- Produktionstests nur auf pze.itenion.com (main), nicht auf Preview-URLs
- Tailwind-Safelist für dynamisch genutzte Klassen in Shared Components
