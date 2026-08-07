-- ============================================================================
-- MIGRATION: PM-Basis-Wochenarbeitszeit auf Projektebene
-- Version: v1
-- Datum: 23.06.2026
-- Ziel-DB: PRODUKTION (Silaflex laeuft nur in PROD)
-- ============================================================================
-- Hintergrund:
--   Die PM->Stunden-Umrechnung, die Foerder-Monatsgrenze und der
--   Abrechnungs-Stundensatz liefen bisher fest auf 40h/Woche (173,33 h/PM).
--   standard_weekly_hours (Firma) existiert bereits. Hier kommt die
--   projektbezogene Foerderbasis dazu: WAZ laut Antrag/Bescheid.
--
--   NULL = Projekt erbt standard_weekly_hours der Firma (Default-Verhalten).
--   Damit bleiben alle Bestandsprojekte unveraendert (40 bzw. Firmenstandard).
-- ============================================================================

-- 1) Neue Spalte (idempotent)
ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS pm_basis_weekly_hours numeric;

COMMENT ON COLUMN v7_projects.pm_basis_weekly_hours IS
  'WAZ-Basis aus Antrag/Bescheid fuer PM->Stunden, Foerder-Monatsgrenze und Abrechnungs-Stundensatz. NULL = erbt standard_weekly_hours der Firma.';

-- ============================================================================
-- 2) Silaflex: beide Projekte auf 37h-Basis setzen (Antrag/Bescheid = 37h,
--    obwohl die Vertraege real 37,5h sind -> Datenfehler im Antrag).
--    Scope strikt ueber die beiden FKZ.
-- ============================================================================

-- Vorab pruefen: liefert genau 2 Zeilen (InGrav + GRAVID)?
SELECT id, name, funding_reference, pm_basis_weekly_hours
FROM v7_projects
WHERE funding_reference IN ('16DS251591', '16DS251601');

-- Update (nur ausfuehren, wenn obiges SELECT genau die 2 Silaflex-Projekte zeigt)
UPDATE v7_projects
SET pm_basis_weekly_hours = 37
WHERE funding_reference IN ('16DS251591', '16DS251601');

-- ============================================================================
-- 3) Kontrolle nach dem Update
-- ============================================================================
SELECT id, name, funding_reference, pm_basis_weekly_hours
FROM v7_projects
WHERE funding_reference IN ('16DS251591', '16DS251601');
-- Erwartet: beide Zeilen pm_basis_weekly_hours = 37
