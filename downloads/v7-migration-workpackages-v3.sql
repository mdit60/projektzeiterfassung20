-- ============================================
-- V7 MIGRATION: Arbeitspakete und Zuordnungen
-- V6 -> V7 Datenmigration (KORRIGIERT)
-- Stand: 03. Januar 2026
-- ============================================
-- 
-- KORREKTUR: Erst löschen, dann einfügen (statt ON CONFLICT)
-- ============================================

-- ============================================
-- SCHRITT 0: Vorhandene V7-Daten prüfen
-- ============================================

SELECT 'VOR Migration:' as status;
SELECT 'v7_work_packages' as tabelle, COUNT(*) as anzahl FROM v7_work_packages
UNION ALL
SELECT 'v7_work_package_assignments', COUNT(*) FROM v7_work_package_assignments
UNION ALL
SELECT 'v7_project_assignments', COUNT(*) FROM v7_project_assignments;

-- ============================================
-- SCHRITT 1: Alte V7-Daten löschen
-- (nur die migrierten, nicht manuell erstellte)
-- ============================================

DELETE FROM v7_work_package_assignments;
DELETE FROM v7_work_packages;
DELETE FROM v7_project_assignments;

-- ============================================
-- SCHRITT 2: Arbeitspakete migrieren
-- work_packages -> v7_work_packages
-- ============================================

INSERT INTO v7_work_packages (
    id,
    project_id,
    ap_number,
    ap_code,
    name,
    description,
    start_month,
    end_month,
    start_date,
    end_date,
    total_person_months,
    total_costs,
    is_active,
    created_at,
    updated_at
)
SELECT 
    wp.id,
    wp.project_id,
    COALESCE(wp.display_order, ROW_NUMBER() OVER (PARTITION BY wp.project_id ORDER BY wp.created_at)) as ap_number,
    wp.code as ap_code,
    COALESCE(wp.description, 'Arbeitspaket ' || COALESCE(wp.code, wp.display_order::text)) as name,
    wp.category as description,
    NULL as start_month,
    NULL as end_month,
    wp.start_date,
    wp.end_date,
    CASE 
        WHEN wp.estimated_hours IS NOT NULL AND wp.estimated_hours > 0 
        THEN ROUND(wp.estimated_hours / 173.33, 2)
        ELSE NULL 
    END as total_person_months,
    wp.budget_amount as total_costs,
    COALESCE(wp.is_active, true) as is_active,
    COALESCE(wp.created_at, NOW()) as created_at,
    COALESCE(wp.updated_at, NOW()) as updated_at
FROM work_packages wp
WHERE wp.project_id IN (SELECT id FROM v7_projects);

SELECT 'Arbeitspakete migriert:' as info, COUNT(*) as anzahl FROM v7_work_packages;

-- ============================================
-- SCHRITT 3: User-Employee Mapping erstellen
-- ============================================

DROP TABLE IF EXISTS user_employee_mapping;

CREATE TEMP TABLE user_employee_mapping AS
SELECT DISTINCT
    up.user_id as user_profile_id,
    v7e.id as v7_employee_id,
    up.name as up_name,
    v7e.display_name as v7_name
FROM user_profiles up
JOIN v7_employees v7e ON (
    v7e.email = up.email 
    OR v7e.display_name = up.name
    OR CONCAT(v7e.last_name, ', ', v7e.first_name) = up.name
    OR v7e.display_name LIKE '%' || up.last_name || '%'
)
WHERE up.company_id IN (SELECT id FROM v7_client_companies);

SELECT 'User-Employee Mappings:' as info, COUNT(*) as anzahl FROM user_employee_mapping;

-- ============================================
-- SCHRITT 4: AP-Zuordnungen migrieren
-- Nur erste Zuordnung pro (work_package_id, employee_id) nehmen
-- ============================================

INSERT INTO v7_work_package_assignments (
    id,
    work_package_id,
    employee_id,
    planned_person_months,
    planned_hours,
    role_description,
    is_active,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid() as id,
    work_package_id,
    v7_employee_id as employee_id,
    person_months as planned_person_months,
    CASE 
        WHEN person_months IS NOT NULL 
        THEN ROUND(person_months * 173.33, 2)
        ELSE NULL 
    END as planned_hours,
    role as role_description,
    true as is_active,
    assigned_at as created_at,
    NOW() as updated_at
FROM (
    SELECT DISTINCT ON (wpa.work_package_id, uem.v7_employee_id)
        wpa.work_package_id,
        uem.v7_employee_id,
        wpa.person_months,
        wpa.role,
        COALESCE(wpa.assigned_at, NOW()) as assigned_at
    FROM work_package_assignments wpa
    JOIN user_employee_mapping uem ON wpa.user_profile_id = uem.user_profile_id
    WHERE wpa.work_package_id IN (SELECT id FROM v7_work_packages)
    ORDER BY wpa.work_package_id, uem.v7_employee_id, wpa.assigned_at DESC
) as unique_assignments;

SELECT 'AP-Zuordnungen migriert:' as info, COUNT(*) as anzahl FROM v7_work_package_assignments;

-- ============================================
-- SCHRITT 5: Projekt-Zuordnungen migrieren
-- Nur erste Zuordnung pro (project_id, employee_id) nehmen
-- ============================================

INSERT INTO v7_project_assignments (
    id,
    project_id,
    employee_id,
    role_in_project,
    is_active,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid() as id,
    project_id,
    v7_employee_id as employee_id,
    role as role_in_project,
    true as is_active,
    assigned_at as created_at,
    NOW() as updated_at
FROM (
    SELECT DISTINCT ON (pa.project_id, uem.v7_employee_id)
        pa.project_id,
        uem.v7_employee_id,
        pa.role,
        COALESCE(pa.assigned_at, NOW()) as assigned_at
    FROM project_assignments pa
    JOIN user_employee_mapping uem ON pa.user_profile_id = uem.user_profile_id
    WHERE pa.project_id IN (SELECT id FROM v7_projects)
    ORDER BY pa.project_id, uem.v7_employee_id, pa.assigned_at DESC
) as unique_assignments;

SELECT 'Projekt-Zuordnungen migriert:' as info, COUNT(*) as anzahl FROM v7_project_assignments;

-- ============================================
-- SCHRITT 6: Ergebnis prüfen
-- ============================================

SELECT 'NACH Migration:' as status;
SELECT 'v7_work_packages' as tabelle, COUNT(*) as anzahl FROM v7_work_packages
UNION ALL
SELECT 'v7_work_package_assignments', COUNT(*) FROM v7_work_package_assignments
UNION ALL
SELECT 'v7_project_assignments', COUNT(*) FROM v7_project_assignments;

-- Detail-Ansicht pro Firma
SELECT 
    cc.name as firma,
    COUNT(DISTINCT p.id) as projekte,
    COUNT(DISTINCT pa.employee_id) as zugeordnete_ma,
    COUNT(DISTINCT wp.id) as arbeitspakete,
    COUNT(DISTINCT wpa.id) as ap_zuordnungen
FROM v7_client_companies cc
LEFT JOIN v7_projects p ON p.client_company_id = cc.id AND p.is_active = true
LEFT JOIN v7_project_assignments pa ON pa.project_id = p.id AND pa.is_active = true
LEFT JOIN v7_work_packages wp ON wp.project_id = p.id AND wp.is_active = true
LEFT JOIN v7_work_package_assignments wpa ON wpa.work_package_id = wp.id AND wpa.is_active = true
GROUP BY cc.name
ORDER BY cc.name;

-- Aufräumen
DROP TABLE IF EXISTS user_employee_mapping;
