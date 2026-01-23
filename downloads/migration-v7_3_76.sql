-- ============================================================================
-- PZE V7.3.76 - MIGRATION: Arbeitspakete Erweiterungen
-- ============================================================================
-- Datum: 23. Januar 2026
-- 
-- AENDERUNGEN:
-- 1. is_technical (BOOLEAN) - Unterscheidung technisch/nicht-technisch
-- 2. start_date / end_date existieren bereits - werden jetzt befuellt
-- 3. start_month / end_month bleiben fuer Abwaertskompatibilitaet
-- ============================================================================

-- ============================================================================
-- SCHRITT 1: Pruefen ob Spalten existieren und ggf. hinzufuegen
-- ============================================================================

-- is_technical Flag hinzufuegen (falls nicht vorhanden)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'v7_work_packages' 
        AND column_name = 'is_technical'
    ) THEN
        ALTER TABLE v7_work_packages 
        ADD COLUMN is_technical BOOLEAN DEFAULT false;
        
        COMMENT ON COLUMN v7_work_packages.is_technical IS 
            'true = Technisches AP (B), false = Nicht-technisches AP (A) bei Durchfuehrbarkeitsstudien';
    END IF;
END $$;

-- ap_sub_number hinzufuegen (falls nicht vorhanden)
-- Fuer APs wie AP1.1, AP1.2, AP2.1 etc.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'v7_work_packages' 
        AND column_name = 'ap_sub_number'
    ) THEN
        ALTER TABLE v7_work_packages 
        ADD COLUMN ap_sub_number INTEGER DEFAULT NULL;
        
        COMMENT ON COLUMN v7_work_packages.ap_sub_number IS 
            'Unter-Nummer fuer hierarchische APs (z.B. 1 fuer AP1.1, 2 fuer AP1.2)';
    END IF;
END $$;

-- start_date hinzufuegen (falls nicht vorhanden)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'v7_work_packages' 
        AND column_name = 'start_date'
    ) THEN
        ALTER TABLE v7_work_packages 
        ADD COLUMN start_date DATE DEFAULT NULL;
        
        COMMENT ON COLUMN v7_work_packages.start_date IS 
            'Absolutes Startdatum des Arbeitspakets (TT.MM.JJJJ)';
    END IF;
END $$;

-- end_date hinzufuegen (falls nicht vorhanden)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'v7_work_packages' 
        AND column_name = 'end_date'
    ) THEN
        ALTER TABLE v7_work_packages 
        ADD COLUMN end_date DATE DEFAULT NULL;
        
        COMMENT ON COLUMN v7_work_packages.end_date IS 
            'Absolutes Enddatum des Arbeitspakets (TT.MM.JJJJ)';
    END IF;
END $$;

-- ============================================================================
-- SCHRITT 2: Unique Constraint anpassen (ap_number + ap_sub_number)
-- ============================================================================

-- Alten Constraint entfernen (falls vorhanden)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'v7_work_packages_unique'
        AND table_name = 'v7_work_packages'
    ) THEN
        ALTER TABLE v7_work_packages DROP CONSTRAINT v7_work_packages_unique;
    END IF;
END $$;

-- Neuen Constraint mit ap_sub_number hinzufuegen
-- Erlaubt: AP1, AP1.1, AP1.2 im selben Projekt
ALTER TABLE v7_work_packages 
ADD CONSTRAINT v7_work_packages_unique 
UNIQUE(project_id, ap_number, ap_sub_number);

-- ============================================================================
-- SCHRITT 3: Index fuer is_technical
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_v7_work_packages_technical 
ON v7_work_packages(is_technical);

-- ============================================================================
-- SCHRITT 4: Bestehende Daten migrieren (start_month -> start_date)
-- ============================================================================

-- Wenn start_month gesetzt ist aber start_date nicht,
-- berechne start_date aus Projekt-Startdatum + Monate
-- (Dies ist eine Approximation - manuell pruefen!)

UPDATE v7_work_packages wp
SET start_date = p.start_date + (wp.start_month - 1) * INTERVAL '1 month'
FROM v7_projects p
WHERE wp.project_id = p.id
  AND wp.start_month IS NOT NULL 
  AND wp.start_date IS NULL
  AND p.start_date IS NOT NULL;

UPDATE v7_work_packages wp
SET end_date = p.start_date + (wp.end_month - 1) * INTERVAL '1 month' + INTERVAL '1 month' - INTERVAL '1 day'
FROM v7_projects p
WHERE wp.project_id = p.id
  AND wp.end_month IS NOT NULL 
  AND wp.end_date IS NULL
  AND p.start_date IS NOT NULL;

-- ============================================================================
-- FERTIG
-- ============================================================================

-- Pruefe das Ergebnis
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'v7_work_packages'
ORDER BY ordinal_position;
