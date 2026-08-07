-- ============================================================================
-- MIGRATION: Gehaltsfelder in v7_employees
-- Session 44 - 12. Mai 2026
-- Ausfuehren auf DEV und PROD
-- ============================================================================

-- Neue Felder fuer Stundensatzberechnung (Anlage 6.1)
ALTER TABLE v7_employees ADD COLUMN IF NOT EXISTS monthly_salary numeric;
ALTER TABLE v7_employees ADD COLUMN IF NOT EXISTS annual_bonus numeric DEFAULT 0;
ALTER TABLE v7_employees ADD COLUMN IF NOT EXISTS company_weekly_hours numeric DEFAULT 40;
ALTER TABLE v7_employees ADD COLUMN IF NOT EXISTS hourly_rate numeric;

-- Kommentare
COMMENT ON COLUMN v7_employees.monthly_salary IS 'Fix-Monatsbruttolohn lt. Arbeitsvertrag (EUR)';
COMMENT ON COLUMN v7_employees.annual_bonus IS 'Weitere fixe Gehaltsbestandteile EUR/Jahr (Anlage 6.1a: Weihnachtsgeld, Urlaubsgeld etc.)';
COMMENT ON COLUMN v7_employees.company_weekly_hours IS 'Betriebsuebliche Wochenarbeitszeit bWAZ (Vollzeit, Default 40)';
COMMENT ON COLUMN v7_employees.hourly_rate IS 'Kalkulatorischer Stundensatz = (monthly_salary*12 + annual_bonus) / (weekly_hours*52)';
