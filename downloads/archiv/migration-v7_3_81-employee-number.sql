-- ============================================
-- MIGRATION: employee_number zu v7_project_assignments
-- Version: v7.3.81
-- Datum: 23. Januar 2026
-- ============================================
-- 
-- Zweck: MA-Nummer aus ZIM-Antrag (Anlage 6.2) speichern
-- für korrekte Sortierung der Team-Mitglieder
--
-- Die employee_number ist projektspezifisch:
-- - MA 1 in Projekt A kann eine andere Person sein als MA 1 in Projekt B
-- - Wird beim ZIM-Import aus Anlage 6.2 übernommen
-- ============================================

-- Spalte hinzufügen
ALTER TABLE v7_project_assignments 
ADD COLUMN IF NOT EXISTS employee_number INTEGER;

-- Kommentar zur Dokumentation
COMMENT ON COLUMN v7_project_assignments.employee_number IS 
'Laufende MA-Nummer aus dem Förderantrag (Anlage 6.2). Projektspezifisch, für Sortierung.';

-- Index für schnelle Sortierung
CREATE INDEX IF NOT EXISTS idx_v7_project_assignments_employee_number 
ON v7_project_assignments(project_id, employee_number);

-- ============================================
-- Optional: Bestehende Einträge mit Platzhalter-Nummern versehen
-- (falls bereits Daten vorhanden sind)
-- ============================================

-- Temporäre Funktion um bestehende Einträge zu nummerieren
-- UPDATE v7_project_assignments pa
-- SET employee_number = sub.row_num
-- FROM (
--     SELECT id, 
--            ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) as row_num
--     FROM v7_project_assignments
--     WHERE employee_number IS NULL
-- ) sub
-- WHERE pa.id = sub.id;

-- ============================================
-- VERIFIZIERUNG
-- ============================================

-- Prüfe ob Spalte existiert:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'v7_project_assignments' 
-- AND column_name = 'employee_number';
