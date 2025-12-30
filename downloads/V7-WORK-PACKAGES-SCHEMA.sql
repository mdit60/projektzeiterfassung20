-- ============================================
-- V7 ARBEITSPAKETE-SCHEMA
-- Erweiterung für ZIM-Projektanträge
-- Stand: 30. Dezember 2024
-- ============================================

-- ============================================
-- 1. ARBEITSPAKETE (Work Packages)
-- Gehören zu einem Projekt
-- ============================================

CREATE TABLE v7_work_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,
    
    -- Arbeitspaket-Identifikation
    ap_number INTEGER NOT NULL,           -- 1, 2, 3, ... (Reihenfolge im Antrag)
    ap_code TEXT,                         -- "AP1", "AP2" oder "1", "2" etc.
    name TEXT NOT NULL,                   -- Bezeichnung des Arbeitspakets
    
    -- Zeitraum
    start_month INTEGER,                  -- Projektmonat Start (1-36)
    end_month INTEGER,                    -- Projektmonat Ende (1-36)
    start_date DATE,                      -- Absolutes Startdatum
    end_date DATE,                        -- Absolutes Enddatum
    
    -- Aufwand (aus Antrag)
    total_person_months NUMERIC(6,2),     -- Gesamt-PM für dieses AP
    total_costs NUMERIC(12,2),            -- Gesamt-Kosten für dieses AP
    
    -- Beschreibung
    description TEXT,                     -- Kurzbeschreibung des AP
    deliverables TEXT,                    -- Ergebnisse/Meilensteine
    
    -- Import-Metadaten
    source_filename TEXT,                 -- Aus welcher Datei importiert
    imported_at TIMESTAMPTZ,              -- Wann importiert
    
    -- Sonstiges
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ein AP-Nummer pro Projekt nur einmal
    CONSTRAINT v7_work_packages_unique UNIQUE(project_id, ap_number)
);

CREATE INDEX idx_v7_work_packages_project ON v7_work_packages(project_id);
CREATE INDEX idx_v7_work_packages_active ON v7_work_packages(is_active);

-- ============================================
-- 2. ARBEITSPAKET-ZUORDNUNGEN (Work Package Assignments)
-- Welcher MA arbeitet in welchem AP mit wie viel PM
-- ============================================

CREATE TABLE v7_work_package_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_package_id UUID NOT NULL REFERENCES v7_work_packages(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES v7_employees(id) ON DELETE CASCADE,
    
    -- Geplanter Aufwand (aus Antrag)
    planned_person_months NUMERIC(6,2),   -- PM laut Antrag für diesen MA in diesem AP
    planned_hours NUMERIC(8,2),           -- Stunden (PM * 140 oder manuell)
    planned_costs NUMERIC(12,2),          -- Kosten laut Antrag
    
    -- Stundensatz (aus Antrag Anlage 6.1/6.2)
    hourly_rate NUMERIC(8,2),             -- €/Stunde laut Antrag
    
    -- Rolle im AP
    role_description TEXT,                -- z.B. "Projektleiter", "Entwickler"
    
    -- Ist-Daten (für spätere Erfassung)
    actual_hours NUMERIC(8,2),            -- Tatsächlich geleistete Stunden
    actual_costs NUMERIC(12,2),           -- Tatsächliche Kosten
    
    -- Import-Metadaten
    source_filename TEXT,
    imported_at TIMESTAMPTZ,
    
    -- Sonstiges
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ein MA pro AP nur einmal
    CONSTRAINT v7_wp_assignments_unique UNIQUE(work_package_id, employee_id)
);

CREATE INDEX idx_v7_wp_assignments_wp ON v7_work_package_assignments(work_package_id);
CREATE INDEX idx_v7_wp_assignments_employee ON v7_work_package_assignments(employee_id);

-- ============================================
-- 3. PROJEKT-BUDGET (Project Budget)
-- Gesamtbudget und Förderquoten aus Antrag
-- ============================================

CREATE TABLE v7_project_budget (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,
    
    -- Gesamtkosten
    total_costs NUMERIC(14,2),            -- Gesamtkosten laut Antrag
    personnel_costs NUMERIC(14,2),        -- Personalkosten
    material_costs NUMERIC(14,2),         -- Materialkosten
    subcontract_costs NUMERIC(14,2),      -- Fremdleistungen
    overhead_costs NUMERIC(14,2),         -- Gemeinkosten
    
    -- Förderung
    funding_rate NUMERIC(5,2),            -- Förderquote in % (z.B. 45.00)
    funding_amount NUMERIC(14,2),         -- Fördersumme
    own_contribution NUMERIC(14,2),       -- Eigenanteil
    
    -- Laufzeit
    duration_months INTEGER,              -- Laufzeit in Monaten
    total_person_months NUMERIC(8,2),     -- Gesamt-Personenmonate
    
    -- Import-Metadaten
    source_filename TEXT,
    imported_at TIMESTAMPTZ,
    
    -- Sonstiges
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ein Budget pro Projekt
    CONSTRAINT v7_project_budget_unique UNIQUE(project_id)
);

CREATE INDEX idx_v7_project_budget_project ON v7_project_budget(project_id);

-- ============================================
-- TRIGGER: Auto-Update Timestamp
-- ============================================

CREATE TRIGGER v7_work_packages_updated 
    BEFORE UPDATE ON v7_work_packages 
    FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();

CREATE TRIGGER v7_wp_assignments_updated 
    BEFORE UPDATE ON v7_work_package_assignments 
    FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();

CREATE TRIGGER v7_project_budget_updated 
    BEFORE UPDATE ON v7_project_budget 
    FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();

-- ============================================
-- RLS: Entwicklungsmodus (deaktiviert)
-- ============================================

ALTER TABLE v7_work_packages DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_work_package_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_project_budget DISABLE ROW LEVEL SECURITY;

-- ============================================
-- HILFSFUNKTION: PM zu Stunden
-- Standard: 1 PM = 140 Stunden (ZIM-Kalkulation)
-- ============================================

CREATE OR REPLACE FUNCTION v7_pm_to_hours(pm NUMERIC, hours_per_pm NUMERIC DEFAULT 140)
RETURNS NUMERIC AS $$
BEGIN
    RETURN ROUND(pm * hours_per_pm, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Beispiel: SELECT v7_pm_to_hours(2.5); -- Ergebnis: 350.00

-- ============================================
-- VIEW: Projekt-Übersicht mit Arbeitspaketen
-- ============================================

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

-- ============================================
-- VIEW: Arbeitspaket-Details mit MA
-- ============================================

CREATE OR REPLACE VIEW v7_work_package_details AS
SELECT 
    wp.id AS work_package_id,
    wp.project_id,
    wp.ap_number,
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
ORDER BY wp.project_id, wp.ap_number, e.display_name;

-- ============================================
-- ENDE ARBEITSPAKETE-SCHEMA
-- ============================================

/*
ANLEITUNG ZUR AUSFÜHRUNG:

1. Öffne Supabase Dashboard
2. Gehe zu "SQL Editor"
3. Kopiere dieses gesamte Script
4. Führe es aus (Run)

Nach erfolgreicher Ausführung hast du:
- v7_work_packages: Arbeitspakete pro Projekt
- v7_work_package_assignments: MA-Zuordnungen zu APs
- v7_project_budget: Gesamtbudget pro Projekt
- v7_project_overview: View für Projekt-Übersicht
- v7_work_package_details: View für AP-Details mit MA

Prüfen mit:
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'v7_work%';
SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'v7_%';
*/
