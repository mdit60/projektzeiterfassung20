-- ============================================
-- V7 MIGRATION: Zeiterfassung auf AP-Ebene
-- work_package_id zu v7_timesheets hinzufügen
-- Stand: 07. Januar 2026
-- VERSION: v7.3.6
-- ============================================
--
-- ZWECK:
-- Die Zeiterfassung muss pro Arbeitspaket (AP) erfolgen,
-- nicht nur pro Projekt. Das entspricht dem Excel-Stundennachweis.
--
-- ÄNDERUNGEN:
-- 1. work_package_id Spalte hinzufügen
-- 2. absence_code Spalte für Fehlzeiten (U/K/S/F)
-- 3. is_billable Flag für förderbare vs nicht-förderbare Stunden
-- 4. Index für schnelle Abfragen
-- 5. View für Monatsübersicht
--
-- ============================================

-- ============================================
-- SCHRITT 1: Prüfen aktuelles Schema
-- ============================================

SELECT 'VORHER - v7_timesheets Spalten:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'v7_timesheets'
ORDER BY ordinal_position;

-- ============================================
-- SCHRITT 2: Neue Spalten hinzufügen
-- ============================================

-- 2.1 work_package_id (Foreign Key zu v7_work_packages)
ALTER TABLE v7_timesheets 
ADD COLUMN IF NOT EXISTS work_package_id UUID REFERENCES v7_work_packages(id) ON DELETE SET NULL;

-- 2.2 absence_code für Fehlzeiten
-- U = Urlaub, K = Krankheit, S = Sonderurlaub, F = Feiertag
ALTER TABLE v7_timesheets 
ADD COLUMN IF NOT EXISTS absence_code TEXT;

-- 2.3 is_billable Flag (förderbar = true, nicht förderbar = false)
ALTER TABLE v7_timesheets 
ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT true;

-- 2.4 notes für optionale Bemerkungen
ALTER TABLE v7_timesheets 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================
-- SCHRITT 3: project_id optional machen
-- (kann aus work_package abgeleitet werden)
-- ============================================

-- project_id bleibt für Abwärtskompatibilität, aber nullable
ALTER TABLE v7_timesheets 
ALTER COLUMN project_id DROP NOT NULL;

-- ============================================
-- SCHRITT 4: Constraint für Datenintegrität
-- ============================================

-- Entweder work_package_id ODER absence_code muss gesetzt sein
-- (Man bucht entweder Stunden auf ein AP oder hat Fehlzeit)
ALTER TABLE v7_timesheets 
DROP CONSTRAINT IF EXISTS v7_timesheets_entry_type_check;

ALTER TABLE v7_timesheets 
ADD CONSTRAINT v7_timesheets_entry_type_check 
CHECK (
  (work_package_id IS NOT NULL AND absence_code IS NULL) OR
  (work_package_id IS NULL AND absence_code IS NOT NULL) OR
  (work_package_id IS NULL AND absence_code IS NULL AND is_billable = false)
);

-- ============================================
-- SCHRITT 5: Unique Constraint
-- Pro MA, Tag und AP nur ein Eintrag
-- ============================================

ALTER TABLE v7_timesheets 
DROP CONSTRAINT IF EXISTS v7_timesheets_unique_entry;

-- Für AP-Einträge: employee + date + work_package
CREATE UNIQUE INDEX IF NOT EXISTS v7_timesheets_unique_wp_entry 
ON v7_timesheets (employee_id, work_date, work_package_id) 
WHERE work_package_id IS NOT NULL;

-- Für Fehlzeiten: employee + date + absence_code
CREATE UNIQUE INDEX IF NOT EXISTS v7_timesheets_unique_absence_entry 
ON v7_timesheets (employee_id, work_date, absence_code) 
WHERE absence_code IS NOT NULL;

-- Für nicht-förderbare Stunden: employee + date + is_billable=false
CREATE UNIQUE INDEX IF NOT EXISTS v7_timesheets_unique_nonbillable_entry 
ON v7_timesheets (employee_id, work_date) 
WHERE work_package_id IS NULL AND absence_code IS NULL AND is_billable = false;

-- ============================================
-- SCHRITT 6: Performance-Indizes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_v7_timesheets_work_package 
ON v7_timesheets(work_package_id);

CREATE INDEX IF NOT EXISTS idx_v7_timesheets_employee_month 
ON v7_timesheets(employee_id, EXTRACT(YEAR FROM work_date), EXTRACT(MONTH FROM work_date));

CREATE INDEX IF NOT EXISTS idx_v7_timesheets_absence 
ON v7_timesheets(absence_code) 
WHERE absence_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_v7_timesheets_billable 
ON v7_timesheets(is_billable);

-- ============================================
-- SCHRITT 7: View für Monatsübersicht
-- ============================================

CREATE OR REPLACE VIEW v7_timesheet_monthly_summary AS
SELECT 
  t.employee_id,
  e.display_name AS employee_name,
  e.client_company_id,
  EXTRACT(YEAR FROM t.work_date)::INTEGER AS year,
  EXTRACT(MONTH FROM t.work_date)::INTEGER AS month,
  
  -- Förderbare Stunden pro AP
  t.work_package_id,
  wp.ap_code,
  wp.name AS wp_name,
  p.id AS project_id,
  p.name AS project_name,
  p.funding_reference,
  
  -- Summen
  SUM(CASE WHEN t.is_billable = true AND t.work_package_id IS NOT NULL THEN t.hours ELSE 0 END) AS billable_hours,
  SUM(CASE WHEN t.is_billable = false THEN t.hours ELSE 0 END) AS non_billable_hours,
  COUNT(CASE WHEN t.absence_code = 'U' THEN 1 END) AS vacation_days,
  COUNT(CASE WHEN t.absence_code = 'K' THEN 1 END) AS sick_days,
  COUNT(CASE WHEN t.absence_code = 'S' THEN 1 END) AS special_leave_days,
  COUNT(CASE WHEN t.absence_code = 'F' THEN 1 END) AS holiday_days

FROM v7_timesheets t
JOIN v7_employees e ON t.employee_id = e.id
LEFT JOIN v7_work_packages wp ON t.work_package_id = wp.id
LEFT JOIN v7_projects p ON wp.project_id = p.id
WHERE t.is_active = true
GROUP BY 
  t.employee_id, 
  e.display_name, 
  e.client_company_id,
  EXTRACT(YEAR FROM t.work_date),
  EXTRACT(MONTH FROM t.work_date),
  t.work_package_id,
  wp.ap_code,
  wp.name,
  p.id,
  p.name,
  p.funding_reference;

-- ============================================
-- SCHRITT 8: View für Tages-Details
-- ============================================

CREATE OR REPLACE VIEW v7_timesheet_daily AS
SELECT 
  t.id,
  t.employee_id,
  e.display_name AS employee_name,
  e.client_company_id,
  t.work_date,
  EXTRACT(YEAR FROM t.work_date)::INTEGER AS year,
  EXTRACT(MONTH FROM t.work_date)::INTEGER AS month,
  EXTRACT(DAY FROM t.work_date)::INTEGER AS day,
  TO_CHAR(t.work_date, 'Dy') AS day_name,
  EXTRACT(DOW FROM t.work_date)::INTEGER AS day_of_week,
  
  -- Arbeitspaket-Info
  t.work_package_id,
  wp.ap_code,
  wp.name AS wp_name,
  p.id AS project_id,
  p.name AS project_name,
  p.funding_reference,
  
  -- Stunden und Typ
  t.hours,
  t.is_billable,
  t.absence_code,
  t.notes,
  t.day_type,
  
  -- Meta
  t.data_source,
  t.entered_by,
  t.entered_at,
  t.created_at,
  t.updated_at

FROM v7_timesheets t
JOIN v7_employees e ON t.employee_id = e.id
LEFT JOIN v7_work_packages wp ON t.work_package_id = wp.id
LEFT JOIN v7_projects p ON wp.project_id = p.id
WHERE t.is_active = true;

-- ============================================
-- SCHRITT 9: Prüfen neues Schema
-- ============================================

SELECT 'NACHHER - v7_timesheets Spalten:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'v7_timesheets'
ORDER BY ordinal_position;

-- ============================================
-- SCHRITT 10: Beispiel-Abfragen
-- ============================================

-- Alle Einträge eines MA für einen Monat
-- SELECT * FROM v7_timesheet_daily 
-- WHERE employee_id = 'xxx' AND year = 2026 AND month = 1
-- ORDER BY day, ap_code;

-- Monatssummen pro AP
-- SELECT * FROM v7_timesheet_monthly_summary
-- WHERE employee_id = 'xxx' AND year = 2026 AND month = 1;

-- ============================================
-- FERTIG
-- ============================================

SELECT 'Migration v7.3.6 erfolgreich!' AS status;
SELECT 
  'v7_timesheets hat jetzt:' AS info,
  '- work_package_id (FK zu v7_work_packages)' AS neu1,
  '- absence_code (U/K/S/F)' AS neu2,
  '- is_billable (true/false)' AS neu3,
  '- notes (optional)' AS neu4;
