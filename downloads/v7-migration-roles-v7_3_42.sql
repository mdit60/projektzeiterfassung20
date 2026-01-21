-- ============================================
-- MIGRATION: Rollen-Erweiterung für Firmenportal
-- Version: v7.3.42
-- Datum: 21. Januar 2026
-- ============================================

-- ============================================
-- 1. USER_PROFILES: Firmen-Rollen ergänzen
-- ============================================

-- Kommentar aktualisieren für role-Spalte
COMMENT ON COLUMN v7_user_profiles.role IS 
'Benutzer-Rolle: 
 - system_admin: Vollzugriff (Cubintec)
 - consultant: Berater (Cubintec)
 - client_admin: Firmen-Administrator (Vollzugriff eigene Firma)
 - project_leader: Projektleiter (nur zugeordnete Projekte/Mitarbeiter)
 - employee: Mitarbeiter (nur eigene Zeiterfassung)';

-- ============================================
-- 2. PROJECT_ASSIGNMENTS: Projekt-Rolle standardisieren
-- ============================================

-- Bestehende Freitext-Werte in role_in_project standardisieren
-- (Falls bereits Daten vorhanden)
UPDATE v7_project_assignments
SET role_in_project = 'team_member'
WHERE role_in_project IS NULL OR role_in_project = '';

-- Neue Spalte für Projektleiter-Flag
ALTER TABLE v7_project_assignments 
ADD COLUMN IF NOT EXISTS is_project_leader BOOLEAN DEFAULT false;

-- Kommentar für role_in_project
COMMENT ON COLUMN v7_project_assignments.role_in_project IS 
'Fachliche Rolle im Projekt (Freitext): z.B. Entwickler, Techniker, Projektmanager';

-- Kommentar für is_project_leader
COMMENT ON COLUMN v7_project_assignments.is_project_leader IS 
'true = Dieser Mitarbeiter ist Projektleiter für dieses Projekt.
 Projektleiter können: 
 - Das Projekt bearbeiten
 - Team-Zeiterfassungen sehen
 - Arbeitspakete verwalten
 Projektleiter können NICHT:
 - Neue Mitarbeiter anlegen
 - Andere Projekte sehen';

-- Index für schnelle Abfrage der Projektleiter
CREATE INDEX IF NOT EXISTS idx_v7_project_assignments_leader 
ON v7_project_assignments(project_id) 
WHERE is_project_leader = true;

-- ============================================
-- 3. EMPLOYEES: Firmen-Rolle für Login
-- ============================================

-- Neue Spalte für die Portal-Rolle des Mitarbeiters
ALTER TABLE v7_employees 
ADD COLUMN IF NOT EXISTS portal_role TEXT DEFAULT 'employee';

-- Kommentar
COMMENT ON COLUMN v7_employees.portal_role IS 
'Portal-Rolle des Mitarbeiters:
 - client_admin: Firmen-Administrator (Vollzugriff)
 - project_leader: Kann Projektleiter für Projekte sein
 - employee: Nur eigene Zeiterfassung (Standard)
 
 Hinweis: project_leader hier bedeutet, dass der MA die BERECHTIGUNG hat,
 Projektleiter zu sein. Die tatsächliche Zuordnung erfolgt in 
 v7_project_assignments.is_project_leader';

-- Check-Constraint für gültige Werte
ALTER TABLE v7_employees 
ADD CONSTRAINT v7_employees_portal_role_check 
CHECK (portal_role IN ('client_admin', 'project_leader', 'employee'));

-- ============================================
-- 4. VIEW: Projekt mit Projektleiter
-- ============================================

CREATE OR REPLACE VIEW v7_projects_with_leader AS
SELECT 
    p.*,
    pa.employee_id AS project_leader_id,
    e.display_name AS project_leader_name,
    e.email AS project_leader_email
FROM v7_projects p
LEFT JOIN v7_project_assignments pa 
    ON pa.project_id = p.id 
    AND pa.is_project_leader = true 
    AND pa.is_active = true
LEFT JOIN v7_employees e 
    ON e.id = pa.employee_id;

-- ============================================
-- 5. VIEW: Mitarbeiter mit Projekt-Zuordnungen
-- ============================================

CREATE OR REPLACE VIEW v7_employees_with_projects AS
SELECT 
    e.*,
    COALESCE(
        json_agg(
            json_build_object(
                'project_id', p.id,
                'project_name', p.name,
                'is_project_leader', pa.is_project_leader,
                'role_in_project', pa.role_in_project
            )
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::json
    ) AS assigned_projects
FROM v7_employees e
LEFT JOIN v7_project_assignments pa 
    ON pa.employee_id = e.id 
    AND pa.is_active = true
LEFT JOIN v7_projects p 
    ON p.id = pa.project_id 
    AND p.is_active = true
GROUP BY e.id;

-- ============================================
-- ROLLBACK (falls nötig)
-- ============================================

/*
-- Rollback-Befehle:
DROP VIEW IF EXISTS v7_employees_with_projects;
DROP VIEW IF EXISTS v7_projects_with_leader;
ALTER TABLE v7_employees DROP CONSTRAINT IF EXISTS v7_employees_portal_role_check;
ALTER TABLE v7_employees DROP COLUMN IF EXISTS portal_role;
DROP INDEX IF EXISTS idx_v7_project_assignments_leader;
ALTER TABLE v7_project_assignments DROP COLUMN IF EXISTS is_project_leader;
*/

-- ============================================
-- ENDE MIGRATION
-- ============================================
