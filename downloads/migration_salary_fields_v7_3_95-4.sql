-- ============================================================================
-- PZE V7 - Migration: Gehaltsfelder in v7_employees
-- Version: v7.3.95-4
-- Datum: 09. Maerz 2026
-- ============================================================================
-- Ergaenzt fehlende Gehaltsfelder in v7_employees:
--
--   Bereits vorhanden (per frueherer ALTER TABLE - IF NOT EXISTS ist sicher):
--   - annual_salary          NUMERIC(10,2)  Jahresbrutto gesamt
--   - hourly_rate            NUMERIC(8,2)   Kalkulatorischer Stundensatz
--   - company_weekly_hours   NUMERIC(4,1)   Betriebsuebliche WAZ (bWAZ)
--
--   NEU (diese Migration):
--   - monthly_gross          NUMERIC(10,2)  Fix-Monatsbruttolohn lt. Arbeitsvertrag
--   - additional_salary_components NUMERIC(10,2) Weihnachtsgeld, Urlaubsgeld etc.
--   - employee_number        INTEGER        Lfd. Nr. lt. Anlage 6.1 (globaler Stamm)
--
-- HINWEIS: employee_number in v7_project_assignments bleibt die massgebliche
-- Nummer pro Projekt (kann pro Projekt unterschiedlich sein). Das Feld in
-- v7_employees ist nur ein Vorschlagswert fuer neue Projektzuordnungen.
--
-- Alle ALTER TABLE mit IF NOT EXISTS - sicher wiederholbar (idempotent).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Felder die moeglicherweise bereits vorhanden sind (fruehere Migrationen)
--    IF NOT EXISTS macht dies sicher idempotent
-- ----------------------------------------------------------------------------

ALTER TABLE v7_employees
  ADD COLUMN IF NOT EXISTS annual_salary NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS company_weekly_hours NUMERIC(4,1) DEFAULT 40.0;

-- ----------------------------------------------------------------------------
-- 2. NEUE Felder: Gehaltsdetails aufgeschluesselt
-- ----------------------------------------------------------------------------

-- Fix-Monatsbruttolohn lt. Arbeitsvertrag (Anlage 6.1 Spalte 1, Monatsbasis)
ALTER TABLE v7_employees
  ADD COLUMN IF NOT EXISTS monthly_gross NUMERIC(10,2);

-- Weitere fixe Gehaltsbestandteile pro Jahr
-- (Weihnachtsgeld, Urlaubsgeld, Jahrespraemien - Anlage 6.1a)
ALTER TABLE v7_employees
  ADD COLUMN IF NOT EXISTS additional_salary_components NUMERIC(10,2) DEFAULT 0;

-- Lfd. Nr. im Firmenstamm (Vorschlagswert, massgeblich ist v7_project_assignments.employee_number)
ALTER TABLE v7_employees
  ADD COLUMN IF NOT EXISTS employee_number INTEGER;

-- ----------------------------------------------------------------------------
-- 3. Kommentare fuer Dokumentation
-- ----------------------------------------------------------------------------

COMMENT ON COLUMN v7_employees.monthly_gross IS
  'Fix-Monatsbruttolohn lt. Arbeitsvertrag (Anlage 6.1 Spalte 1, Monatsbasis). annual_salary = monthly_gross * 12 + additional_salary_components';

COMMENT ON COLUMN v7_employees.additional_salary_components IS
  'Weitere fixe jaehrliche Gehaltsbestandteile: Weihnachtsgeld, Urlaubsgeld, Jahrespraemien etc. (Anlage 6.1a). Oft 0.';

COMMENT ON COLUMN v7_employees.annual_salary IS
  'Jahresbrutto gesamt = monthly_gross * 12 + additional_salary_components. Wird fuer Stundensatzberechnung verwendet.';

COMMENT ON COLUMN v7_employees.hourly_rate IS
  'Kalkulatorischer Stundensatz = annual_salary / (weekly_hours * 52). Kann manuell ueberschrieben werden.';

COMMENT ON COLUMN v7_employees.company_weekly_hours IS
  'Betriebsuebliche Wochenarbeitszeit Vollzeit (bWAZ, i.d.R. 40h). Fuer Teilzeitfaktor-Berechnung.';

COMMENT ON COLUMN v7_employees.employee_number IS
  'Lfd. Nr. im Firmenstamm (Vorschlagswert). Massgeblich ist v7_project_assignments.employee_number pro Projekt.';

-- ----------------------------------------------------------------------------
-- 4. Bestehende annual_salary-Werte aufteilen (Datenmigration)
--    Wo annual_salary schon gefuellt ist aber monthly_gross noch NULL:
--    -> monthly_gross = annual_salary / 12 (Naeherungswert, additional = 0)
-- ----------------------------------------------------------------------------

UPDATE v7_employees
SET
  monthly_gross = ROUND(annual_salary / 12, 2),
  additional_salary_components = 0
WHERE
  annual_salary IS NOT NULL
  AND monthly_gross IS NULL;

-- ----------------------------------------------------------------------------
-- 5. Pruefabfrage (zum manuellen Verifizieren nach Ausfuehren)
-- ----------------------------------------------------------------------------

-- Zeigt alle Gehaltsfelder der ersten 10 Mitarbeiter:
-- SELECT
--   display_name,
--   monthly_gross,
--   additional_salary_components,
--   annual_salary,
--   weekly_hours,
--   company_weekly_hours,
--   hourly_rate,
--   employee_number
-- FROM v7_employees
-- ORDER BY display_name
-- LIMIT 10;

-- ============================================================================
-- ENDE MIGRATION v7.3.95-4
-- ============================================================================
