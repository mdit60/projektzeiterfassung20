-- ============================================================================
-- PZE V7 - Migration: ZA-Faelligkeitsdatum
-- ============================================================================
-- Version: v7.4.4
-- Datum: 12. Maerz 2026
--
-- Zweck:
--   Ergaenzt v7_projects um das Feld naechste_za_faellig (DATE).
--   Dieses Feld speichert das naechste geplante ZA-Einreichungsdatum.
--   Default: 3 Monate nach Projektstart (wird per UPDATE gesetzt).
--   Editierbar ueber das Berater-Portal (ProjectDetailPage / Bearbeiten).
--
-- Ausfuehren in: Supabase SQL Editor (Dev + Prod)
-- ============================================================================

-- 1. Feld hinzufuegen
ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS naechste_za_faellig DATE DEFAULT NULL;

-- 2. Default-Wert setzen: 3 Monate nach Projektstart
--    Nur fuer ZIM-Projekte ohne vorhandenen Wert
UPDATE v7_projects
SET naechste_za_faellig = (start_date + INTERVAL '3 months')::DATE
WHERE
  naechste_za_faellig IS NULL
  AND start_date IS NOT NULL
  AND funding_format LIKE 'ZIM%';

-- 3. Pruefergebnis anzeigen
SELECT
  id,
  short_name,
  funding_format,
  start_date,
  naechste_za_faellig
FROM v7_projects
WHERE funding_format LIKE 'ZIM%'
ORDER BY short_name;
