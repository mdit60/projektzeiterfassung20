-- ============================================
-- V7 MIGRATION: Arbeitspakete und Zuordnungen
-- V6 -> V7 Datenmigration
-- Stand: 03. Januar 2026
-- ============================================
-- 
-- Migriert:
-- 1. work_packages -> v7_work_packages (61 Datensätze)
-- 2. work_package_assignments -> v7_work_package_assignments (117 Datensätze)
-- 3. project_assignments -> v7_project_assignments (13 Datensätze)
--
-- WICHTIG: Erst Schritt für Schritt ausführen!
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
-- SCHRITT 1: Arbeitspakete migrieren
-- work_packages -> v7_work_packages
-- ============================================

-- Mapping: V6 verwendet user_profile_id, V7 verwendet employee_id
-- Wir müssen über email/name matchen

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
    COALESCE(wp.display_order, 1) as ap_number,
    wp.code as ap_code,
    COALESCE(wp.description, 'Arbeitspaket ' || COALESCE(wp.code, wp.display_order::text)) as name,
    wp.category as description,  -- category als Beschreibung verwenden
    NULL as start_month,  -- V6 hat nur start_date
    NULL as end_month,
    wp.start_date,
    wp.end_date,
    -- estimated_hours in PM umrechnen (173,33 h/PM)
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
-- Nur für Projekte die in V7 existieren
WHERE wp.project_id IN (SELECT id FROM v7_projects)
ON CONFLICT (project_id, ap_number) DO UPDATE SET
    ap_code = EXCLUDED.ap_code,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    total_person_months = EXCLUDED.total_person_months,
    total_costs = EXCLUDED.total_costs,
    updated_at = NOW();

-- ============================================
-- SCHRITT 2: AP-Zuordnungen migrieren
-- work_package_assignments -> v7_work_package_assignments
-- ============================================

-- Erst Mapping-Tabelle erstellen (user_profile_id -> v7_employee_id)
CREATE TEMP TABLE user_employee_mapping AS
SELECT 
    up.user_id as user_profile_id,
    v7e.id as v7_employee_id,
    up.name as up_name,
    v7e.display_name as v7_name
FROM user_profiles up
JOIN v7_employees v7e ON (
    v7e.email = up.email 
    OR v7e.display_name = up.name
    OR CONCAT(v7e.last_name, ', ', v7e.first_name) = up.name
);

-- Prüfe Mapping
SELECT 'User-Employee Mapping:' as info;
SELECT * FROM user_employee_mapping;

-- Jetzt AP-Zuordnungen migrieren
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
    wpa.work_package_id,
    uem.v7_employee_id as employee_id,
    wpa.person_months as planned_person_months,
    -- Falls person_months vorhanden, in Stunden umrechnen
    CASE 
        WHEN wpa.person_months IS NOT NULL 
        THEN ROUND(wpa.person_months * 173.33, 2)
        ELSE NULL 
    END as planned_hours,
    wpa.role as role_description,
    true as is_active,
    COALESCE(wpa.assigned_at, NOW()) as created_at,
    NOW() as updated_at
FROM work_package_assignments wpa
JOIN user_employee_mapping uem ON wpa.user_profile_id = uem.user_profile_id
-- Nur für Arbeitspakete die in V7 existieren
WHERE wpa.work_package_id IN (SELECT id FROM v7_work_packages)
ON CONFLICT (work_package_id, employee_id) DO UPDATE SET
    planned_person_months = EXCLUDED.planned_person_months,
    planned_hours = EXCLUDED.planned_hours,
    role_description = EXCLUDED.role_description,
    updated_at = NOW();

-- ============================================
-- SCHRITT 3: Projekt-Zuordnungen migrieren
-- project_assignments -> v7_project_assignments
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
    pa.project_id,
    uem.v7_employee_id as employee_id,
    pa.role as role_in_project,
    true as is_active,
    COALESCE(pa.assigned_at, NOW()) as created_at,
    NOW() as updated_at
FROM project_assignments pa
JOIN user_employee_mapping uem ON pa.user_profile_id = uem.user_profile_id
-- Nur für Projekte die in V7 existieren
WHERE pa.project_id IN (SELECT id FROM v7_projects)
ON CONFLICT (project_id, employee_id) DO UPDATE SET
    role_in_project = EXCLUDED.role_in_project,
    updated_at = NOW();

-- ============================================
-- SCHRITT 4: Ergebnis prüfen
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

-- Temp-Tabelle aufräumen
DROP TABLE IF EXISTS user_employee_mapping;
