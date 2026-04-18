-- ============================================
-- MIGRATION: v7.3.85 - employee_number in project_assignments
-- Datum: 24. Januar 2026
-- ============================================
-- 
-- Fuegt employee_number zu v7_project_assignments hinzu,
-- damit die projektspezifische MA-Nummer auch ohne
-- v7_project_team funktioniert.
-- ============================================

-- Spalte hinzufuegen (falls noch nicht vorhanden)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'v7_project_assignments' 
    AND column_name = 'employee_number'
  ) THEN
    ALTER TABLE v7_project_assignments 
    ADD COLUMN employee_number INTEGER;
    
    COMMENT ON COLUMN v7_project_assignments.employee_number 
    IS 'Projektspezifische lfd. Nr. des MA (gem. Anlage 6.1)';
  END IF;
END $$;

-- Auch hourly_rate hinzufuegen falls nicht vorhanden
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'v7_project_assignments' 
    AND column_name = 'hourly_rate'
  ) THEN
    ALTER TABLE v7_project_assignments 
    ADD COLUMN hourly_rate NUMERIC(8,2);
    
    COMMENT ON COLUMN v7_project_assignments.hourly_rate 
    IS 'Stundensatz des MA fuer dieses Projekt (EUR/h)';
  END IF;
END $$;

-- Auch is_project_leader hinzufuegen falls nicht vorhanden
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'v7_project_assignments' 
    AND column_name = 'is_project_leader'
  ) THEN
    ALTER TABLE v7_project_assignments 
    ADD COLUMN is_project_leader BOOLEAN DEFAULT false;
    
    COMMENT ON COLUMN v7_project_assignments.is_project_leader 
    IS 'Ist dieser MA Projektleiter?';
  END IF;
END $$;

-- Uebersicht
SELECT 'v7_project_assignments Spalten:' AS info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'v7_project_assignments'
ORDER BY ordinal_position;
