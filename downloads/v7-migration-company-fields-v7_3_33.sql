-- ============================================
-- V7 MIGRATION: Förderrelevante Firmendaten
-- Version: v7.3.33
-- Datum: 19. Januar 2026
-- ============================================

-- WICHTIG: Diese Migration in Supabase SQL Editor ausführen!

-- ============================================
-- 1. Neue Spalten für förderrelevante Daten
-- ============================================

-- KMU-Status (EU-Definition: micro, small, medium, large)
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS kmu_status VARCHAR(50);

-- Gründungsjahr
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS founding_year INTEGER;

-- Branche/Wirtschaftszweig
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS industry_sector VARCHAR(255);

-- Anzahl Mitarbeiter (zum Stichtag)
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS employee_count INTEGER;

-- Jahresumsatz in EUR
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS annual_revenue DECIMAL(15,2);

-- Bilanzsumme in EUR
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS balance_sheet_total DECIMAL(15,2);

-- Handelsregisternummer
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS commercial_register VARCHAR(100);

-- USt-IdNr. (falls noch nicht vorhanden)
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS vat_id VARCHAR(50);

-- ============================================
-- 2. Kommentare für Dokumentation
-- ============================================

COMMENT ON COLUMN v7_client_companies.kmu_status IS 'KMU-Einstufung nach EU-Definition: micro (< 10 MA), small (< 50 MA), medium (< 250 MA), large';
COMMENT ON COLUMN v7_client_companies.founding_year IS 'Gründungsjahr des Unternehmens (YYYY)';
COMMENT ON COLUMN v7_client_companies.industry_sector IS 'Branche/Wirtschaftszweig des Unternehmens';
COMMENT ON COLUMN v7_client_companies.employee_count IS 'Anzahl Mitarbeiter (zum Stichtag der letzten Erhebung)';
COMMENT ON COLUMN v7_client_companies.annual_revenue IS 'Jahresumsatz in EUR (letztes abgeschlossenes Geschäftsjahr)';
COMMENT ON COLUMN v7_client_companies.balance_sheet_total IS 'Bilanzsumme in EUR (letztes abgeschlossenes Geschäftsjahr)';
COMMENT ON COLUMN v7_client_companies.commercial_register IS 'Handelsregisternummer (z.B. HRB 12345)';
COMMENT ON COLUMN v7_client_companies.vat_id IS 'Umsatzsteuer-Identifikationsnummer (z.B. DE123456789)';

-- ============================================
-- 3. Check-Constraint für KMU-Status
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'v7_client_companies_kmu_status_check'
    ) THEN
        ALTER TABLE v7_client_companies 
        ADD CONSTRAINT v7_client_companies_kmu_status_check 
        CHECK (kmu_status IS NULL OR kmu_status IN ('micro', 'small', 'medium', 'large'));
    END IF;
END $$;

-- ============================================
-- 4. Check-Constraint für Gründungsjahr
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'v7_client_companies_founding_year_check'
    ) THEN
        ALTER TABLE v7_client_companies 
        ADD CONSTRAINT v7_client_companies_founding_year_check 
        CHECK (founding_year IS NULL OR (founding_year >= 1800 AND founding_year <= EXTRACT(YEAR FROM CURRENT_DATE)));
    END IF;
END $$;

-- ============================================
-- 5. Verifizierung
-- ============================================

-- Prüfe ob alle Spalten existieren
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'v7_client_companies' 
AND column_name IN (
    'kmu_status', 
    'founding_year', 
    'industry_sector', 
    'employee_count', 
    'annual_revenue', 
    'balance_sheet_total', 
    'commercial_register', 
    'vat_id'
)
ORDER BY column_name;

-- ============================================
-- ENDE DER MIGRATION
-- ============================================
