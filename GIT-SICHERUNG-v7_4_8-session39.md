# GIT-SICHERUNG Session 39
**Datum:** 07.05.2026
**SW-Release:** V7.4.8
**Pflichtenheft:** v4.85
**Branch:** v7-dev (nach Session merge auf main)

---

## Was wurde gemacht

### 1. Korrekturen
- PFLICHTENHEFT v4.84: SystemConfigPanel Version korrigiert (7.4.4-2 -> 7.4.4-1)
- Vercel ENV verifiziert: Preview-Build zeigt auf DEV-Supabase (jaiyycmstgepxaqsvnjd), korrekt getrennt

### 2. Cockpit-Konzept v1.1
Entscheidungen A-D getroffen und dokumentiert:
- A+B: Cockpit = gemeinsame Landing Page fuer Berater + Firmen-Admin (Shared Component)
- C: MA-Matrix zeigt nur aktive Projekte; vergangene abrufbar
- D: Zahlungseingang-Betrag kann vom ZA-Betrag abweichen; Kommentar-Feld ergaenzt

### 3. DB-Migration (DEV-Supabase, projektzeiterfassung20)
Neue Felder in v7_zahlungsanforderungen:
- zahlungseingang_datum DATE (nullable)
- zahlungseingang_betrag NUMERIC(12,2) (nullable)
- zahlungseingang_kommentar TEXT (nullable)
- foerderbetrag_gesamt NUMERIC(12,2) (nullable)

**PROD-Migration ausstehend** -- erst nach erfolgreichem DEV-Test durchfuehren.
SQL-Skripte: SQL-MIGRATION-zahlungseingang-v1.sql, SQL-MIGRATION-foerderbetrag-gesamt-v1.sql

### 4. ZAPanel v7.4.4-34 bis v7.4.4-40 (7 Iterationen)

| Version | Was |
|---------|-----|
| 7.4.4-34 | Archiv-Tab neu: Spalten Zahlungseingang/Betrag/Anmerkung inline editierbar, Sichern-Button |
| 7.4.4-35 | foerderbetrag_gesamt beim Speichern fest in DB geschrieben |
| 7.4.4-36 | foerderbetrag_gesamt auch bei Statuswechsel gespeichert |
| 7.4.4-37 | Foerderbetrag im Archiv immer live berechnet (auch Entwurf, kein Speichern noetig) |
| 7.4.4-38 | Einreichdatum editierbar (Zwischenversion, Statusblock) |
| 7.4.4-39 | Einreichdatum ins Formular Zeile 3 (neben ZA-Nr.), nie automatisch ueberschrieben |
| 7.4.4-40 | ZA loeschbar im Archiv-Tab mit Bestaetigung; staerkere Warnung bei Eingereicht/Bewilligt |

**Produktiv eingesetzt:** ZAPanel v7.4.4-40 (DEV getestet, PROD-Deploy steht aus)

---

## Geaenderte Dateien

| Datei | Version | Pfad |
|-------|---------|------|
| ZAPanel.tsx | 7.4.4-40 | src/components/shared/ZAPanel.tsx |
| PFLICHTENHEFT-v4_85.md | 4.85 | /PFLICHTENHEFT-v4_85.md |
| GIT-SICHERUNG-v7_4_8-session39.md | - | /GIT-SICHERUNG-v7_4_8-session39.md |
| KONZEPT-FIRMA-COCKPIT-v1_1.md | 1.1 | /KONZEPT-FIRMA-COCKPIT-v1_1.md |

---

## Naechste Schritte (Session 40+)

1. ZAPanel v7.4.4-40 auf PROD testen und deployen
2. SQL-Migration auf PROD-Supabase ausfuehren
3. Cockpit-Seite implementieren: /v7/berater/foerderung/firma/[id]/cockpit
4. Firmen-Portal: Admin-Landing auf Cockpit
5. MA-Matrix konsolidieren

---

## Offene Punkte

- ZAPanel TS-4 (Rollback Bewilligt -> Eingereicht) weiterhin offen (Niedrig)
- PROD-Migration der 4 neuen DB-Felder ausstehend
- Header-Farbe Berater-Portal Firma-Detailseite (noch blau statt gruen) -- wird durch Cockpit obsolet
