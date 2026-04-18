-- ============================================
-- V7 MIGRATION: Projekt-Team Erweiterung
-- Version: 7.3.87
-- Datum: 03. Februar 2026
-- ============================================
-- 
-- Erweitert v7_project_assignments um:
-- - employee_number: Lfd. Nr. gemäß Anlage 6.1 (projektspezifisch)
-- - hourly_rate: Stundensatz €/h (projektspezifisch)
-- 
-- Die Felder role_in_project, assignment_start, assignment_end
-- existieren bereits in der Tabelle.
-- ============================================

-- 1. Neue Spalte: employee_number (Lfd. Nr. gemäß Anlage 6.1)
-- Diese Nummer ist PROJEKTSPEZIFISCH - gleicher MA kann in verschiedenen
-- Projekten unterschiedliche Nummern haben
ALTER TABLE v7_project_assignments 
ADD COLUMN IF NOT EXISTS employee_number INTEGER;

COMMENT ON COLUMN v7_project_assignments.employee_number IS 
'Laufende Nummer gemäß Anlage 6.1 des Förderantrags. Projektspezifisch!';

-- 2. Neue Spalte: hourly_rate (Stundensatz)
-- Projektspezifisch, da der Stundensatz pro Projekt anders sein kann
ALTER TABLE v7_project_assignments 
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(8,2);

COMMENT ON COLUMN v7_project_assignments.hourly_rate IS 
'Stundensatz in €/h gemäß Förderantrag. Projektspezifisch!';

-- 3. Index für schnelle Suche nach employee_number innerhalb eines Projekts
CREATE INDEX IF NOT EXISTS idx_v7_project_assignments_emp_number 
ON v7_project_assignments(project_id, employee_number);

-- 4. Constraint: employee_number muss innerhalb eines Projekts eindeutig sein
-- (Nur wenn noch nicht existiert)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'v7_project_assignments_emp_number_unique'
    ) THEN
        ALTER TABLE v7_project_assignments 
        ADD CONSTRAINT v7_project_assignments_emp_number_unique 
        UNIQUE (project_id, employee_number);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Constraint existiert bereits
END $$;

-- ============================================
-- PRÜFUNG
-- ============================================

-- Zeige aktuelle Struktur der Tabelle
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'v7_project_assignments'
ORDER BY ordinal_position;

-- ============================================
-- ENDE MIGRATION
-- ============================================

/*
ANLEITUNG:

1. Öffne Supabase Dashboard → SQL Editor
2. Kopiere dieses Script
3. Führe es aus (Run)
4. Prüfe die Ausgabe - sollte die erweiterte Tabellenstruktur zeigen

Nach erfolgreicher Ausführung hat v7_project_assignments:
- employee_number (INTEGER) - Lfd. Nr. gem. Anlage 6.1
- hourly_rate (NUMERIC) - Stundensatz €/h
- Beide Felder sind projektspezifisch!
*/
