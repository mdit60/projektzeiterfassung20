-- ============================================
-- MIGRATION: v7.3.84 - Projektspezifische Mitarbeiter-Nummern
-- Datum: 24. Januar 2026
-- ============================================
-- 
-- PROBLEM:
-- Die employee_number war bisher in v7_employees gespeichert,
-- aber ein Mitarbeiter kann in verschiedenen Projekten
-- unterschiedliche lfd. Nummern haben (gem. Anlage 6.1).
--
-- LOESUNG:
-- Neue Tabelle v7_project_team speichert die Zuordnung
-- Mitarbeiter <-> Projekt inkl. projektspezifischer Nummer.
--
-- BEISPIEL:
-- Thomas Duehrkop ist:
--   - Projekt "DigiTrans": MA #1 (als Projektleiter)
--   - Projekt "BioInk": MA #3 (als Entwickler)
-- ============================================

-- Neue Tabelle: Projekt-Team mit projektspezifischer MA-Nummer
CREATE TABLE IF NOT EXISTS v7_project_team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES v7_employees(id) ON DELETE CASCADE,
    
    -- Projektspezifische Daten
    employee_number INTEGER,           -- lfd. Nr. gem. Anlage 6.1 fuer DIESES Projekt
    role_in_project TEXT,              -- z.B. "Projektleiter", "Entwickler"
    
    -- Optional: Projektspezifischer Stundensatz (falls abweichend)
    hourly_rate_override NUMERIC(8,2), -- Ueberschreibt den MA-Stundensatz fuer dieses Projekt
    
    -- Zeitraum der Mitarbeit (optional)
    start_date DATE,
    end_date DATE,
    
    -- Meta
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ein MA kann nur einmal pro Projekt zugeordnet sein
    CONSTRAINT v7_project_team_unique UNIQUE(project_id, employee_id)
);

-- Indizes fuer schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_v7_project_team_project ON v7_project_team(project_id);
CREATE INDEX IF NOT EXISTS idx_v7_project_team_employee ON v7_project_team(employee_id);
CREATE INDEX IF NOT EXISTS idx_v7_project_team_number ON v7_project_team(project_id, employee_number);

-- Trigger fuer updated_at
CREATE TRIGGER v7_project_team_updated 
    BEFORE UPDATE ON v7_project_team 
    FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();

-- Kommentare
COMMENT ON TABLE v7_project_team IS 'Projektspezifische Mitarbeiter-Zuordnung mit lfd. Nr. gem. Anlage 6.1';
COMMENT ON COLUMN v7_project_team.employee_number IS 'Laufende Nummer des MA in diesem Projekt (gem. Anlage 6.1 des Antrags)';
COMMENT ON COLUMN v7_project_team.role_in_project IS 'Rolle im Projekt: Projektleiter, Entwickler, etc.';
COMMENT ON COLUMN v7_project_team.hourly_rate_override IS 'Optionaler projektspezifischer Stundensatz (ueberschreibt MA-Standardsatz)';

-- ============================================
-- MIGRATION: Bestehende Daten uebernehmen
-- ============================================

-- Schritt 1: Alle MA die bereits AP-Zuordnungen haben, ins Project-Team uebernehmen
INSERT INTO v7_project_team (project_id, employee_id, employee_number, created_at)
SELECT DISTINCT 
    wp.project_id,
    wpa.employee_id,
    e.employee_number,  -- Uebernehme bisherige Nummer (falls vorhanden)
    NOW()
FROM v7_work_package_assignments wpa
JOIN v7_work_packages wp ON wpa.work_package_id = wp.id
JOIN v7_employees e ON wpa.employee_id = e.id
WHERE NOT EXISTS (
    -- Nur wenn noch nicht vorhanden
    SELECT 1 FROM v7_project_team pt 
    WHERE pt.project_id = wp.project_id 
    AND pt.employee_id = wpa.employee_id
)
ON CONFLICT (project_id, employee_id) DO NOTHING;

-- ============================================
-- HINWEIS: employee_number in v7_employees
-- ============================================
-- Das Feld v7_employees.employee_number wird NICHT geloescht,
-- kann aber kuenftig als "Standard-Nummer" oder fuer andere
-- Zwecke verwendet werden. Die projektspezifische Nummer
-- kommt ab jetzt aus v7_project_team.
-- ============================================

-- ============================================
-- UEBERSICHT: Neue Tabellenstruktur
-- ============================================
--
-- v7_employees (Stammdaten)
--   - id, display_name, first_name, last_name
--   - qualification, weekly_hours, annual_salary, hourly_rate
--   - birth_date, education_degree, etc. (Anlage 6.1)
--
-- v7_project_team (Projekt-Zuordnung) NEU
--   - project_id, employee_id
--   - employee_number (projektspezifisch!)
--   - role_in_project
--   - hourly_rate_override (optional)
--
-- v7_wp_assignments (AP-Zuordnung)
--   - work_package_id, employee_id
--   - planned_pm
--
-- ============================================
