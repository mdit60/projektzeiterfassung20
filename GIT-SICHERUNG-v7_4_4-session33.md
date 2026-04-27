# GIT-SICHERUNG SESSION 33
**Datum:** 28. April 2026
**Version:** v7.4.4 / v7.4.5 / v7.4.6
**Status:** Abgeschlossen, bereit fuer PROD

---

## ERLEDIGTE AUFGABEN

### 1. Foerderbetrags-Fix (bewilligte_summe als Deckel)
**Dateien:** ProjektFortschrittPanel-v7_4_5-22, BerichtePage-v7_4_6-4

- bewilligte_summe als harte Obergrenze fuer abrufbare Foerdermittel
- Bei 100% Zielerreichung: max = bewilligte_summe (nicht Plan x Foerdersatz)
- Verschenkt = bewilligte_summe - prognose
- BerichtePage DB-Select um bewilligte_summe ergaenzt

### 2. Mein-Status-Seite aufgeraeumt (MA, PL, Admin)
**Dateien:** mein-status-page-v7_4_4-15, PortalNav-v7_4_4-7

- Download-Buttons entfernt (jetzt im Hilfe-Dropdown der Nav)
- 4 Kennzahl-Kacheln entfernt
- Kennzahlen als kompakte Statuszeile neben ZE-Header
- Warnbalken unten entfernt
- Monatsbuttons kontrastreicher (200er statt 100er Farben)
- Abstände kompakter (ZA-Block ohne Scrollen sichtbar)
- Legende einzeilig unten

### 3. PortalNav: Hilfe-Dropdown + MA-Navigation vereinfacht
**Dateien:** PortalNav-v7_4_4-5 bis -7

- Hilfe-Dropdown mit rollenabhaengigen Anleitungen + FAQ + Kontakt
- employee: keine Nav-Tabs (nur Hilfe-Dropdown)
- PL: behaelt "Meine Zeiterfassung" (direkter Zugriff)
- FIX doppelter React-Import (-6)
- FIX Dropdown-Sichtbarkeit: z-[200], overflow-visible (-7)

### 4. BerichtePage umstrukturiert
**Datei:** BerichtePage-v7_4_6-5

- Projekt-Selektor-Kachel an erster Stelle (Dropdown)
- 3 Report-Kacheln direkt daneben (Stundennachweis, Fortschritt, ZA)
- Panels oeffnen direkt unter den Kacheln (kein Scrollen)
- 4 Kennzahl-Kacheln entfernt
- "Reports erstellen" Header entfernt
- Projekt-Uebersicht-Tabelle darunter
- Personalkosten-Export vorerst ausgeblendet

---

## FINALE VERSIONSNUMMERN

| Datei | Version | Pfad |
|-------|---------|------|
| ProjektFortschrittPanel | v7.4.5-22 | src/components/shared/ProjektFortschrittPanel.tsx |
| BerichtePage | v7.4.6-5 | src/components/shared/BerichtePage.tsx |
| mein-status-page | v7.4.4-15 | src/app/v7/firma/mein-status/page.tsx |
| PortalNav | v7.4.4-7 | src/components/shared/PortalNav.tsx |

---

## DEV-SETUP (nur DEV, nicht PROD relevant)
- AS System MA-Logins in DEV aktiviert (Passwort-Reset per SQL)
- v7_user_profiles fuer alle 5 AS-System-MA angelegt
- v7_employees.user_id auf neue Auth-IDs aktualisiert
- Testpasswort: ASsystem2026!

---

## GIT-WORKFLOW SESSION 33

```bash
cd ~/Documents/Dev/PZE

cp ~/Documents/Dev/PZE/downloads/ProjektFortschrittPanel-v7_4_5-22.tsx src/components/shared/ProjektFortschrittPanel.tsx
cp ~/Documents/Dev/PZE/downloads/BerichtePage-v7_4_6-5.tsx src/components/shared/BerichtePage.tsx
cp ~/Documents/Dev/PZE/downloads/mein-status-page-v7_4_4-15.tsx src/app/v7/firma/mein-status/page.tsx
cp ~/Documents/Dev/PZE/downloads/PortalNav-v7_4_4-7.tsx src/components/shared/PortalNav.tsx
cp ~/Documents/Dev/PZE/downloads/GIT-SICHERUNG-v7_4_4-session33.md GIT-SICHERUNG-v7_4_4-session33.md
cp ~/Documents/Dev/PZE/downloads/PFLICHTENHEFT-v4_76.md PFLICHTENHEFT-v4_76.md

git add -A
git commit -m "feat(v7.4.4-7): Mein-Status aufgeraeumt, Hilfe-Dropdown, BerichtePage umstrukturiert, Foerderbetrag-Fix"
git push origin v7-dev
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
```
