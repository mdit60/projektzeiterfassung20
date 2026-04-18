-- ============================================================
-- V7.3.95-1: Arbeitsplan einfrieren
-- 19. Februar 2026
-- ============================================================
-- Fuehre dieses SQL in der Supabase SQL-Konsole aus
-- (Dashboard > SQL Editor > New Query)
-- ============================================================

-- Neue Spalte: workplan_locked
ALTER TABLE v7_projects 
ADD COLUMN IF NOT EXISTS workplan_locked BOOLEAN DEFAULT false;

-- Kommentar
COMMENT ON COLUMN v7_projects.workplan_locked IS 
'Arbeitsplan eingefroren nach Bewilligung. Nur Berater kann entsperren.';

-- Verifizierung
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'v7_projects' AND column_name = 'workplan_locked';
