-- ============================================================================
-- PZE V7 - Migration: Zuwendungsbescheid-Daten
-- ============================================================================
-- Version: v7.4.5
-- Datum: 02. April 2026
-- Zweck:
--   Ergaenzt v7_projects um zwei zentrale Felder fuer den Zuwendungsbescheid:
--   - zuwendungsbescheid_datum: Datum des Bescheids (DATE)
--   - bewilligte_summe:         Bewilligte Foerdersumme in EUR (NUMERIC)
--   Diese Felder sind projektuebergreifend zentral verfuegbar und koennen
--   von ZA-Panel, Berichten und zukuenftigen Modulen genutzt werden.
--
-- Ausfuehren in: Supabase SQL Editor (zuerst DEV, dann PROD)
-- ============================================================================

-- 1. Felder hinzufuegen
ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS zuwendungsbescheid_datum DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bewilligte_summe         NUMERIC(14,2) DEFAULT NULL;

-- 2. Pruefergebnis anzeigen
SELECT
  id,
  short_name,
  funding_format::TEXT AS funding_format,
  zuwendungsbescheid_datum,
  bewilligte_summe
FROM v7_projects
ORDER BY short_name;
