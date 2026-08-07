# PZE - Supabase-Umgebungen (DEV / PROD)

**Stand:** 29.07.2026

## Zuordnung (wichtig, nicht verwechseln)
- **DEV** = Supabase-Projekt **`projektzeiterfassung20`** (Hauptzweig zeigt in
  Supabase standardmaessig das Label "Production" - das ist NICHT PROD).
- **PROD** = Supabase-Projekt **`PZE-production`** (Ref `cnnuyioklhlrfygwticf`).

## Regel
Schema-Aenderungen IMMER in DEV UND PROD ausfuehren (Paritaet halten). Reihenfolge
in der Regel: erst DEV, testen, dann PROD mit identischer Migration.

## Status VN-Migration (SQL-MIGRATION-verwendungsnachweis-v2.sql)
- DEV (projektzeiterfassung20): AUSGEFUEHRT + verifiziert am 29.07.2026
  (v7_verwendungsnachweise rls_aktiv=true/policies=4; v7_projects.beihilfe_basis
  text Default 'de_minimis').
- PROD (PZE-production): NOCH OFFEN - bewusst zurueckgestellt, bis der DEV-Code
  (verwendungsnachweis-utils + Komponente) getestet ist, falls sich am Schema noch
  Kleinigkeiten ergeben (dann eine finale Migration statt zwei).
