# GIT-SICHERUNG v7.4.4
**Datum:** 10. Maerz 2026
**Branch:** v7-dev + main
**Status:** Deployed auf pze.itenion.com

---

## Zusammenfassung Session

Berater-Portal Navigation komplett ueberarbeitet und stabilisiert.
Alle Zurueck-Buttons fuehren jetzt konsistent zum Dashboard.
Header zeigt in allen Berater-Seiten den Firmennamen korrekt.

---

## Geaenderte Dateien

### 1. berater-dashboard-v7_4_4-4.tsx
**Ziel:** `src/app/v7/berater/dashboard/page.tsx`
**Aenderungen:**
- Projekte-Spalte (Zahl + Icon) klickbar -> `/firma/[id]?tab=projekte`
- Mitarbeiter-Spalte (Zahl + Icon) klickbar -> `/firma/[id]?tab=mitarbeiter`
- Schnellzugriff: Projekte-Button entfernt, nur noch Berichte + Zeiten
- v7.4.4-3: Schnellzugriff-Buttons (Berichte/Zeiten) eingefuehrt, Projekte-Button via Spalten-Klick

### 2. v7-firma-detail-page-v7_4_4-2.tsx
**Ziel:** `src/app/v7/berater/foerderung/firma/[id]/page.tsx`
**Aenderungen:**
- FIX: `firmaName=` -> `companyName=` in allen 3 PortalHeader-Aufrufen
- Header zeigt jetzt korrekt den Firmennamen (statt "PZE")

### 3. berater-berichte-page-v7_4_4-3.tsx
**Ziel:** `src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx`
**Aenderungen:**
- Zurueck-Link: von `/firma/[id]` -> `/v7/berater/dashboard`
- Label: "Zurueck zur Firmenuebersicht" -> "Zurueck zum Dashboard"

### 4. berater-ze-seite-v7_4_0-2.tsx
**Ziel:** `src/app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx`
**Aenderungen:**
- handleBack Default: `/firma/[id]?tab=zeiterfassung` -> `/v7/berater/dashboard`
- companyName="PZE" hardcoded -> `companyName={company.name}`
- returnUrl-Mechanismus bleibt erhalten (Timesheet-Viewer kehrt korrekt zurueck)

---

## Deployment-Protokoll

```bash
# v7-dev (alle Aenderungen)
git add -A
git commit -m "v7.4.4: Navigation-Fixes Berater-Portal (Header, Zurueck-Buttons, ZE)"
git push origin v7-dev

# main (Prod)
git checkout main
git merge v7-dev
git push origin main
git checkout v7-dev
```

---

## Navigation-Prinzip (festgelegt)

Alle Zurueck-Buttons im Berater-Portal ohne expliziten `returnUrl`
-> fuehren immer zum Dashboard (`/v7/berater/dashboard`)

Ausnahme: Wenn `returnUrl`-Parameter gesetzt (z.B. vom Timesheet-Viewer),
dann kehrt der Zurueck-Button zur Ausgangsseite zurueck.

---

## Offene Punkte (naechste Session)

- ZA-Modul Step 4: ZahlungsanforderungPage
- ZA-Modul Step 5: ZA-Status Dashboard-Indikator
- Produktions-DB: v7_update_timestamp()-Funktion + Migration
- Stundensatz-Diskrepanz Annika Arndt (Claude: 20.19 EUR vs. Robin: 20.35 EUR) pruefen
- Berater-Portal User-Manual (PDF)
- Pflichtenheft: v4.41 erstellt und deployed

---

## Pflichtenheft

**Version:** 4.41
**Datei:** PFLICHTENHEFT-v4_41.md
