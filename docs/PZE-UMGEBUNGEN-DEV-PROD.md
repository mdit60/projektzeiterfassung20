# PZE - Supabase-Umgebungen (DEV / PROD)

**Stand:** 20.09.2026

## Zuordnung (wichtig, nicht verwechseln)
- **DEV** = Supabase-Projekt **`projektzeiterfassung20`** (Hauptzweig zeigt in
  Supabase standardmaessig das Label "Production" - das ist NICHT PROD).
- **PROD** = Supabase-Projekt **`PZE-production`** (Ref `cnnuyioklhlrfygwticf`).

## Deployment ist nicht Migration
Ein Vercel-Deployment bringt ausschliesslich **Code** nach Prod. Tabellen und
Spalten entstehen dadurch nicht - die werden nur durch SQL angelegt, und zwar in
jedem Supabase-Projekt einzeln.

Fehlt eine Spalte, die der Code selektiert, bricht die Abfrage mit einem
Spaltenfehler ab und die Seite bleibt leer - unabhaengig davon, wie frisch der
Code ist. Typisches Fehlerbild: "in DEV laeuft es, in PROD nicht".

## Regel
Schema-Aenderungen IMMER in DEV UND PROD ausfuehren (Paritaet halten).
Reihenfolge in der Regel: erst DEV, testen, dann PROD mit identischer Migration.

## Schnelltest: ist eine Migration in einer Umgebung angekommen?
In der jeweiligen Umgebung ausfuehren, Tabellen- und Spaltennamen anpassen:

```sql
SELECT
  to_regclass('public.<TABELLE>') IS NOT NULL AS tabelle_da,
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = '<TABELLE>' AND column_name = '<SPALTE>') AS spalte_da;
```

## Status VN-Migration (SQL-MIGRATION-verwendungsnachweis-v2.sql)
- DEV (projektzeiterfassung20): AUSGEFUEHRT + verifiziert am 29.07.2026
  (v7_verwendungsnachweise rls_aktiv=true/policies=4; v7_projects.beihilfe_basis
  text Default 'de_minimis').
- PROD (PZE-production): **AUSGEFUEHRT**, verifiziert am 20.09.2026
  (v7_verwendungsnachweise vorhanden, v7_projects.beihilfe_basis vorhanden).

  Vorherige Fassung dieses Dokuments (Stand 29.07.2026) wies PROD noch als
  "offen" aus. Das war beim Test des VN-Moduls am 20.09.2026 nicht mehr
  zutreffend - der Status wurde vor der Pruefung nicht nachgezogen und hat zu
  einem unnoetigen Umweg gefuehrt. Statusangaben in diesem Dokument daher vor
  Gebrauch mit dem Schnelltest oben verifizieren.
