-- ============================================
-- V7 Migration: Erweiterte Firmendaten
-- Version: v7.3.2
-- Datum: 06. Januar 2026
-- ============================================

-- 1. Neue Spalten für v7_client_companies
-- ============================================

-- USt-ID (Umsatzsteuer-Identifikationsnummer)
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS vat_id TEXT;

-- Website
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS website TEXT;

-- Logo-URL (Pfad in Supabase Storage)
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Vollständiger juristischer Name (falls anders als Kurzname)
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS legal_name TEXT;


-- 2. Kommentare zur Dokumentation
-- ============================================

COMMENT ON COLUMN v7_client_companies.vat_id IS 
'Umsatzsteuer-ID, z.B. DE123456789';

COMMENT ON COLUMN v7_client_companies.website IS 
'Firmenwebsite, z.B. https://www.firma.de';

COMMENT ON COLUMN v7_client_companies.logo_url IS 
'Pfad zum Firmenlogo in Supabase Storage';

COMMENT ON COLUMN v7_client_companies.legal_name IS 
'Vollständiger juristischer Firmenname (falls anders als name)';


-- ============================================
-- 3. Supabase Storage Bucket erstellen
-- ============================================
-- HINWEIS: Dies muss manuell in der Supabase UI gemacht werden:
-- 
-- 1. Gehe zu Storage in der Supabase Console
-- 2. Klicke "New Bucket"
-- 3. Name: "company-logos"
-- 4. Public: JA (damit Logos ohne Auth angezeigt werden)
-- 5. Allowed MIME types: image/png, image/jpeg, image/svg+xml, image/webp
-- 6. Max file size: 2MB
--
-- Oder per SQL (falls Storage API aktiviert):
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('company-logos', 'company-logos', true);


-- ============================================
-- WICHTIG: Diese Migration in Supabase SQL Editor ausführen!
-- Danach Storage Bucket manuell anlegen!
-- ============================================
