-- Migration: is_technical für Arbeitspakete
-- Datum: 24. Januar 2026
-- Version: 7.3.85
--
-- Bei Durchführbarkeitsstudien (ZIM_DS) wird zwischen technischen
-- und nicht-technischen Arbeitspaketen unterschieden.
-- Default: true (technisch)
-- ============================================================================

-- Feld hinzufügen
ALTER TABLE v7_work_packages 
ADD COLUMN IF NOT EXISTS is_technical BOOLEAN DEFAULT true;

-- Kommentar
COMMENT ON COLUMN v7_work_packages.is_technical IS 
'Technisches AP (true) oder nicht-technisches AP (false). Relevant für ZIM Durchführbarkeitsstudien.';

-- Prüfen
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'v7_work_packages' 
AND column_name = 'is_technical';
