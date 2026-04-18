-- ============================================
-- MIGRATION: v7.3.34 - Foerderrelevante Firmenfelder
-- DATUM: 19. Januar 2026
-- ============================================

-- Neue Spalten fuer v7_client_companies
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS kmu_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS founding_year INTEGER,
ADD COLUMN IF NOT EXISTS industry_sector VARCHAR(255),
ADD COLUMN IF NOT EXISTS employee_count INTEGER,
ADD COLUMN IF NOT EXISTS annual_revenue DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS balance_sheet_total DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS commercial_register VARCHAR(100),
ADD COLUMN IF NOT EXISTS vat_id VARCHAR(50);

-- Check Constraint fuer KMU-Status
ALTER TABLE v7_client_companies 
ADD CONSTRAINT check_kmu_status 
CHECK (kmu_status IS NULL OR kmu_status IN ('micro', 'small', 'medium', 'large'));

-- Check Constraint fuer Gruendungsjahr
ALTER TABLE v7_client_companies 
ADD CONSTRAINT check_founding_year 
CHECK (founding_year IS NULL OR (founding_year >= 1800 AND founding_year <= EXTRACT(YEAR FROM CURRENT_DATE)));

-- Kommentare
COMMENT ON COLUMN v7_client_companies.kmu_status IS 'KMU-Status nach EU-Definition: micro, small, medium, large';
COMMENT ON COLUMN v7_client_companies.founding_year IS 'Gruendungsjahr der Firma';
COMMENT ON COLUMN v7_client_companies.industry_sector IS 'Branche/Industriesektor';
COMMENT ON COLUMN v7_client_companies.employee_count IS 'Anzahl Mitarbeiter (fuer KMU-Einstufung)';
COMMENT ON COLUMN v7_client_companies.annual_revenue IS 'Jahresumsatz in EUR';
COMMENT ON COLUMN v7_client_companies.balance_sheet_total IS 'Bilanzsumme in EUR';
COMMENT ON COLUMN v7_client_companies.commercial_register IS 'Handelsregisternummer (z.B. HRB 12345)';
COMMENT ON COLUMN v7_client_companies.vat_id IS 'Umsatzsteuer-Identifikationsnummer';
