-- ============================================
-- V7 MIGRATION: V6 Daten nach V7 kopieren
-- Stand: 03. Januar 2026 (v3 - mit auth.users IDs)
-- ============================================
-- 
-- WICHTIG: v7_user_profiles.id muss eine gültige auth.users.id sein!
-- Daher verwenden wir user_id aus V6 user_profiles.
--
-- ============================================

-- ============================================
-- SCHRITT 1: V7-Daten komplett löschen
-- ============================================

DELETE FROM v7_work_package_assignments;
DELETE FROM v7_work_packages;
DELETE FROM v7_project_budget;
DELETE FROM v7_fzul_timesheets;
DELETE FROM v7_timesheets;
DELETE FROM v7_project_assignments;
DELETE FROM v7_projects;
DELETE FROM v7_employees;
DELETE FROM v7_data_completion;
DELETE FROM v7_archive;
DELETE FROM v7_consultant_access;
DELETE FROM v7_user_profiles;
DELETE FROM v7_client_companies;
DELETE FROM v7_consultant_companies;

-- ============================================
-- SCHRITT 2: Beraterfirma anlegen (Cubintec)
-- ============================================

INSERT INTO v7_consultant_companies (
    id,
    name,
    short_name,
    city,
    federal_state,
    contact_person,
    contact_email,
    contact_phone,
    is_active
) VALUES (
    '4f20d4bc-588d-4291-bc0b-995943533829',
    'Cubintec GmbH',
    'Cubintec',
    'Bad Neustadt',
    'DE-BY',
    'Martin Ditscherlein',
    'm.ditscherlein@cubintec.com',
    '+49 9771 6353511',
    true
);

-- ============================================
-- SCHRITT 3: Kundenfirmen anlegen
-- ============================================

INSERT INTO v7_client_companies (
    id,
    consultant_company_id,
    name,
    short_name,
    federal_state,
    is_active
)
SELECT 
    c.id,
    '4f20d4bc-588d-4291-bc0b-995943533829' AS consultant_company_id,
    c.name,
    NULL AS short_name,
    'DE-BY' AS federal_state,
    true AS is_active
FROM companies c
WHERE c.id != '4f20d4bc-588d-4291-bc0b-995943533829'
  AND c.name NOT IN ('Cosima Luxury Apartments', 'C-Immo UG');

-- ============================================
-- SCHRITT 4: Berater-User anlegen
-- (Mit echten auth.users IDs!)
-- ============================================

-- Martin Ditscherlein (System Admin)
INSERT INTO v7_user_profiles (
    id,
    email,
    first_name,
    last_name,
    display_name,
    role,
    consultant_company_id,
    client_company_id,
    is_active
) 
SELECT 
    up.user_id,  -- Echte auth.users ID!
    up.email,
    up.first_name,
    up.last_name,
    up.name,
    'system_admin',
    '4f20d4bc-588d-4291-bc0b-995943533829',
    NULL,
    true
FROM user_profiles up
WHERE up.email = 'm.ditscherlein@cubintec.com';

-- Katrin Kirchner (Consultant)
INSERT INTO v7_user_profiles (
    id,
    email,
    first_name,
    last_name,
    display_name,
    role,
    consultant_company_id,
    client_company_id,
    is_active
)
SELECT 
    up.user_id,
    up.email,
    up.first_name,
    up.last_name,
    up.name,
    'consultant',
    '4f20d4bc-588d-4291-bc0b-995943533829',
    NULL,
    true
FROM user_profiles up
WHERE up.email = 'k.kirchner@cubintec.com';

-- ============================================
-- SCHRITT 5: Kunden-User anlegen
-- ============================================

INSERT INTO v7_user_profiles (
    id,
    email,
    first_name,
    last_name,
    display_name,
    role,
    consultant_company_id,
    client_company_id,
    is_active
)
SELECT 
    up.user_id,  -- Echte auth.users ID!
    up.email,
    up.first_name,
    up.last_name,
    up.name AS display_name,
    CASE 
        WHEN up.role = 'admin' THEN 'client_admin'
        ELSE 'client_user'
    END AS role,
    NULL AS consultant_company_id,
    up.company_id AS client_company_id,
    up.is_active
FROM user_profiles up
WHERE up.company_id IN (SELECT id FROM v7_client_companies);

-- ============================================
-- SCHRITT 6: Mitarbeiter-Stammdaten kopieren
-- ============================================

INSERT INTO v7_employees (
    id,
    client_company_id,
    display_name,
    first_name,
    last_name,
    email,
    weekly_hours,
    annual_leave_days,
    position_title,
    qualification,
    employment_start,
    employment_end,
    is_active
)
SELECT 
    gen_random_uuid(),  -- Employees brauchen keine auth.users ID
    up.company_id AS client_company_id,
    up.name AS display_name,
    up.first_name,
    up.last_name,
    up.email,
    COALESCE(up.weekly_hours, 40) AS weekly_hours,
    30 AS annual_leave_days,
    up.job_function AS position_title,
    up.qualification,
    up.employed_since AS employment_start,
    up.employment_end_date AS employment_end,
    up.is_active
FROM user_profiles up
WHERE up.company_id IN (SELECT id FROM v7_client_companies);

-- ============================================
-- SCHRITT 7: Projekte kopieren
-- ============================================

INSERT INTO v7_projects (
    id,
    client_company_id,
    name,
    short_name,
    funding_reference,
    funding_format,
    start_date,
    end_date,
    is_active
)
SELECT 
    p.id,
    p.company_id AS client_company_id,
    p.name,
    p.short_name,
    p.funding_reference,
    COALESCE(p.funding_format, 'zim') AS funding_format,
    p.start_date,
    p.end_date,
    COALESCE(p.is_active, true) AS is_active
FROM projects p
WHERE p.company_id IN (SELECT id FROM v7_client_companies);

-- ============================================
-- FERTIG! Zusammenfassung
-- ============================================

SELECT 'Migration abgeschlossen!' AS status;

SELECT 
    (SELECT COUNT(*) FROM v7_consultant_companies) AS berater_firmen,
    (SELECT COUNT(*) FROM v7_client_companies) AS kunden_firmen,
    (SELECT COUNT(*) FROM v7_user_profiles WHERE role IN ('system_admin', 'consultant')) AS berater_user,
    (SELECT COUNT(*) FROM v7_user_profiles WHERE role IN ('client_admin', 'client_user')) AS kunden_user,
    (SELECT COUNT(*) FROM v7_employees) AS mitarbeiter,
    (SELECT COUNT(*) FROM v7_projects) AS projekte;
