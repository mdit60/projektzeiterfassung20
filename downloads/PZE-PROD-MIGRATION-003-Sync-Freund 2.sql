-- ============================================================
-- PZE PROD-DB MIGRATION 003: Sync Freund-Daten mit Dev-DB
-- Datum: 16. Februar 2026
-- ============================================================
-- Ausfuehren in PZE-production SQL Editor
-- Bringt Prod-DB auf gleichen Stand wie Dev-DB
-- ============================================================


-- ============================================================
-- SCHRITT 1: Alte AP-Zuordnungen komplett loeschen
-- ============================================================
DELETE FROM v7_work_package_assignments
WHERE work_package_id IN (
  SELECT id FROM v7_work_packages 
  WHERE project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
);


-- ============================================================
-- SCHRITT 2: Alte Projekt-Zuordnungen loeschen
-- ============================================================
DELETE FROM v7_project_assignments
WHERE project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1);


-- ============================================================
-- SCHRITT 3: Vieten deaktivieren, neue MA anlegen
-- ============================================================

-- Vieten deaktivieren (nicht loeschen, falls spaeter noch gebraucht)
UPDATE v7_employees
SET is_active = false
WHERE display_name = 'Vieten, Claudia Christina'
  AND client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

-- Schoebel aktualisieren (neue Qualification + Position)
UPDATE v7_employees
SET qualification = 'Berufsausbildung',
    position_title = 'Kaufmaennische Assistentin'
WHERE display_name = 'Schoebel, Carolin'
  AND client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

-- Freund aktualisieren (Qualification)
UPDATE v7_employees
SET qualification = 'Master/Diplom'
WHERE display_name = 'Freund, Robin'
  AND client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

-- Arndt, Annika (NEU)
INSERT INTO v7_employees (
  client_company_id, display_name, first_name, last_name,
  email, qualification, weekly_hours, portal_role, position_title,
  company_weekly_hours
)
VALUES (
  (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1),
  'Arndt, Annika', 'Annika', 'Arndt',
  'annika.arndt@steuerkanzlei-freund.de', 'Master/Diplom', 40.0, 'employee', 'Wirtschaftsjuristin',
  40.0
);

-- Mueller, Anett (NEU)
INSERT INTO v7_employees (
  client_company_id, display_name, first_name, last_name,
  email, qualification, weekly_hours, portal_role, position_title,
  company_weekly_hours
)
VALUES (
  (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1),
  'Mueller, Anett', 'Anett', 'Mueller',
  'anett.mueller@steuerkanzlei-freund.de', 'Master/Diplom', 40.0, 'employee', 'Steuerfachwirt',
  40.0
);


-- ============================================================
-- SCHRITT 4: Projekt-Zuordnungen neu anlegen
-- ============================================================

-- #1 Freund -> Projektleiter
INSERT INTO v7_project_assignments (project_id, employee_id, role_in_project, hourly_rate, employee_number, is_project_leader)
VALUES (
  (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1),
  (SELECT id FROM v7_employees WHERE last_name = 'Freund' AND client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1) LIMIT 1),
  'Projektleiter', 28.85, 1, false
);

-- #2 Arndt -> Systemarchitekt
INSERT INTO v7_project_assignments (project_id, employee_id, role_in_project, hourly_rate, employee_number, is_project_leader)
VALUES (
  (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1),
  (SELECT id FROM v7_employees WHERE last_name = 'Arndt' AND client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1) LIMIT 1),
  'Systemarchitekt', null, 2, false
);

-- #3 Schoebel -> Wissenschaftlicher Mitarbeiter
INSERT INTO v7_project_assignments (project_id, employee_id, role_in_project, hourly_rate, employee_number, is_project_leader)
VALUES (
  (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1),
  (SELECT id FROM v7_employees WHERE last_name = 'Schoebel' AND client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1) LIMIT 1),
  'Wissenschaftlicher Mitarbeiter', 24.54, 3, false
);

-- #4 Mueller -> Systemtester
INSERT INTO v7_project_assignments (project_id, employee_id, role_in_project, hourly_rate, employee_number, is_project_leader)
VALUES (
  (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1),
  (SELECT id FROM v7_employees WHERE last_name = 'Mueller' AND client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1) LIMIT 1),
  'Systemtester', null, 4, false
);


-- ============================================================
-- SCHRITT 5: AP-Zuordnungen neu anlegen (20 Eintraege)
-- ============================================================

-- AP1: Freund 0.75, Arndt 1.00, Mueller 1.00
INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 0.75
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP1' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Freund' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 1.00
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP1' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Arndt' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 1.00
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP1' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Mueller' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

-- AP2: Freund 0.75, Arndt 1.00, Schoebel 2.00, Mueller 1.00
INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 0.75
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP2' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Freund' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 1.00
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP2' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Arndt' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 2.00
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP2' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Schoebel' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 1.00
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP2' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Mueller' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

-- AP3: Freund 1.00, Arndt 1.50, Schoebel 1.00, Mueller 1.50
INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 1.00
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP3' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Freund' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 1.50
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP3' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Arndt' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 1.00
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP3' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Schoebel' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 1.50
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP3' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Mueller' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

-- AP4.1: Freund 0.25, Schoebel 0.50
INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 0.25
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP4.1' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Freund' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 0.50
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP4.1' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Schoebel' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

-- AP4.2: Schoebel 0.50
INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 0.50
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP4.2' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Schoebel' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

-- AP5: Freund 0.25, Schoebel 0.50
INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 0.25
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP5' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Freund' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 0.50
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP5' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Schoebel' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

-- AP6: Freund 0.25, Schoebel 0.50
INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 0.25
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP6' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Freund' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 0.50
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP6' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Schoebel' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

-- AP7: Freund 0.25, Schoebel 0.50
INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 0.25
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP7' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Freund' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);

INSERT INTO v7_work_package_assignments (work_package_id, employee_id, planned_person_months)
SELECT wp.id, e.id, 0.50
FROM v7_work_packages wp, v7_employees e
WHERE wp.ap_code = 'AP7' AND wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
  AND e.last_name = 'Schoebel' AND e.client_company_id = (SELECT id FROM v7_client_companies WHERE short_name = 'Freund' LIMIT 1);


-- ============================================================
-- SCHRITT 6: AP total_person_months neu berechnen
-- ============================================================
UPDATE v7_work_packages wp
SET total_person_months = (
  SELECT COALESCE(SUM(wpa.planned_person_months), 0)
  FROM v7_work_package_assignments wpa
  WHERE wpa.work_package_id = wp.id AND wpa.is_active = true
)
WHERE wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1);


-- ============================================================
-- PRUEF-QUERY
-- ============================================================
-- SELECT wp.ap_code, e.display_name, wpa.planned_person_months
-- FROM v7_work_package_assignments wpa
-- JOIN v7_work_packages wp ON wp.id = wpa.work_package_id
-- JOIN v7_employees e ON e.id = wpa.employee_id
-- WHERE wp.project_id = (SELECT id FROM v7_projects WHERE short_name = 'ANOVIA' LIMIT 1)
-- ORDER BY wp.ap_number, wp.ap_sub_number NULLS FIRST, e.display_name;
