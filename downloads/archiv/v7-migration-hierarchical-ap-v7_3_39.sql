-- ============================================
-- V7 MIGRATION: Hierarchische AP-Nummern
-- VERSION: v7.3.39 (KORRIGIERT)
-- DATUM: 20. Januar 2026
-- ============================================
-- 
-- PROBLEM: 
-- Die bisherige UNIQUE Constraint (project_id, ap_number) erlaubt
-- nur eine AP-Nummer pro Projekt. Bei hierarchischen Nummern wie
-- "1.1", "1.2", "2", "2.1" etc. werden mehrere APs mit gleicher
-- Hauptnummer (ap_number) angelegt, was zu Konflikten fuehrt.
--
-- LOESUNG:
-- 1. ap_code wird zum eindeutigen Identifikator (AP1, AP1.1, AP1.2, etc.)
-- 2. UNIQUE Constraint wird auf (project_id, ap_code) geaendert
-- 3. ap_sub_number wird hinzugefuegt fuer bessere Sortierung
--
-- ============================================

-- ============================================
-- SCHRITT 1: Views ZUERST droppen (wichtig!)
-- ============================================

DROP VIEW IF EXISTS v7_work_package_details CASCADE;
DROP VIEW IF EXISTS v7_project_overview CASCADE;

-- ============================================
-- SCHRITT 2: Backup erstellen (optional)
-- ============================================

CREATE TABLE IF NOT EXISTS v7_work_packages_backup_20260120 AS 
SELECT * FROM v7_work_packages;

-- ============================================
-- SCHRITT 3: Neue Spalte fuer Unter-Nummer hinzufuegen
-- ============================================

ALTER TABLE v7_work_packages 
ADD COLUMN IF NOT EXISTS ap_sub_number INTEGER DEFAULT 0;

COMMENT ON COLUMN v7_work_packages.ap_sub_number IS 'Unter-Nummer des AP: 0=Hauptpaket (AP1), 1=erstes Unterpaket (AP1.1), etc.';

-- ============================================
-- SCHRITT 4: Bestehende Daten aktualisieren
-- ============================================

-- Erst alle leeren ap_codes mit Default belegen
UPDATE v7_work_packages 
SET ap_code = CONCAT('AP', ap_number) 
WHERE ap_code IS NULL OR ap_code = '';

-- ap_sub_number aus ap_code extrahieren
UPDATE v7_work_packages 
SET ap_sub_number = CASE 
    WHEN ap_code ~ 'AP?\d+\.\d+' THEN 
        COALESCE((regexp_match(ap_code, '\.(\d+)'))[1]::INTEGER, 0)
    ELSE 0
END
WHERE ap_sub_number IS NULL OR ap_sub_number = 0;

-- ap_number aus ap_code korrigieren (Hauptnummer extrahieren)
UPDATE v7_work_packages 
SET ap_number = COALESCE((regexp_match(ap_code, 'AP?(\d+)', 'i'))[1]::INTEGER, ap_number)
WHERE ap_code IS NOT NULL AND ap_code != '';

-- ============================================
-- SCHRITT 5: Alte Constraint entfernen
-- ============================================

ALTER TABLE v7_work_packages 
DROP CONSTRAINT IF EXISTS v7_work_packages_unique;

ALTER TABLE v7_work_packages 
DROP CONSTRAINT IF EXISTS v7_work_packages_project_id_ap_number_key;

-- ============================================
-- SCHRITT 6: Neue Constraint hinzufuegen
-- ============================================

ALTER TABLE v7_work_packages 
ADD CONSTRAINT v7_work_packages_unique_code UNIQUE(project_id, ap_code);

-- ============================================
-- SCHRITT 7: Index fuer Sortierung erstellen
-- ============================================

DROP INDEX IF EXISTS idx_v7_work_packages_sort;

CREATE INDEX idx_v7_work_packages_sort 
ON v7_work_packages(project_id, ap_number, ap_sub_number);

-- ============================================
-- SCHRITT 8: Views NEU erstellen
-- ============================================

-- View: Projekt-Uebersicht
CREATE OR REPLACE VIEW v7_project_overview AS
SELECT 
    p.id AS project_id,
    p.name AS project_name,
    p.funding_reference AS fkz,
    p.funding_format,
    p.start_date,
    p.end_date,
    cc.id AS client_company_id,
    cc.name AS client_company_name,
    COUNT(DISTINCT wp.id) AS work_package_count,
    COUNT(DISTINCT pa.employee_id) AS employee_count,
    COALESCE(SUM(wp.total_person_months), 0) AS total_pm,
    pb.total_costs,
    pb.funding_amount,
    pb.funding_rate
FROM v7_projects p
JOIN v7_client_companies cc ON p.client_company_id = cc.id
LEFT JOIN v7_work_packages wp ON p.id = wp.project_id AND wp.is_active = true
LEFT JOIN v7_project_assignments pa ON p.id = pa.project_id AND pa.is_active = true
LEFT JOIN v7_project_budget pb ON p.id = pb.project_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.funding_reference, p.funding_format, p.start_date, p.end_date,
         cc.id, cc.name, pb.total_costs, pb.funding_amount, pb.funding_rate;

-- View: Arbeitspaket-Details mit MA (MIT ap_sub_number)
CREATE OR REPLACE VIEW v7_work_package_details AS
SELECT 
    wp.id AS work_package_id,
    wp.project_id,
    wp.ap_number,
    wp.ap_sub_number,
    wp.ap_code,
    wp.name AS wp_name,
    wp.start_month,
    wp.end_month,
    wp.total_person_months AS wp_total_pm,
    e.id AS employee_id,
    e.display_name AS employee_name,
    e.qualification,
    wpa.planned_person_months,
    wpa.planned_hours,
    wpa.hourly_rate,
    wpa.planned_costs,
    wpa.actual_hours,
    wpa.actual_costs
FROM v7_work_packages wp
LEFT JOIN v7_work_package_assignments wpa ON wp.id = wpa.work_package_id AND wpa.is_active = true
LEFT JOIN v7_employees e ON wpa.employee_id = e.id AND e.is_active = true
WHERE wp.is_active = true
ORDER BY wp.project_id, wp.ap_number, wp.ap_sub_number, e.display_name;

-- ============================================
-- VERIFIZIERUNG
-- ============================================

SELECT 'Spalten der v7_work_packages Tabelle:' AS info;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'v7_work_packages' 
AND column_name IN ('ap_number', 'ap_sub_number', 'ap_code')
ORDER BY ordinal_position;

SELECT 'Constraints:' AS info;

SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'v7_work_packages';

SELECT 'Beispieldaten (erste 10):' AS info;

SELECT 
    project_id,
    ap_code,
    ap_number,
    ap_sub_number,
    name
FROM v7_work_packages
ORDER BY project_id, ap_number, ap_sub_number
LIMIT 10;

-- ============================================
-- ENDE MIGRATION
-- ============================================
