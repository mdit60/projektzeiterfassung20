-- ============================================
-- V7 Migration: Client Company Status & Onboarding
-- Version: v7.3.0
-- Datum: 06. Januar 2026
-- ============================================

-- 1. Neue Spalten für v7_client_companies
-- ============================================

-- Status der Firma (invited, registered, active, inactive)
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('invited', 'registered', 'active', 'inactive'));

-- Art des Onboardings
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS onboarding_type TEXT 
CHECK (onboarding_type IN ('by_consultant', 'self_registration'));

-- Wann wurde eingeladen
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- Wann hat sich registriert/aktiviert
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ;

-- Einladungs-Token (für Selbstregistrierung via Link)
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS invitation_token UUID DEFAULT gen_random_uuid();

-- Token-Ablaufdatum
ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;


-- 2. Bestehende Firmen auf 'active' + 'by_consultant' setzen
-- ============================================

UPDATE v7_client_companies 
SET 
  status = 'active',
  onboarding_type = 'by_consultant',
  registered_at = created_at
WHERE status IS NULL;


-- 3. Index für schnelle Status-Abfragen
-- ============================================

CREATE INDEX IF NOT EXISTS idx_v7_client_companies_status 
ON v7_client_companies(status);

CREATE INDEX IF NOT EXISTS idx_v7_client_companies_invitation_token 
ON v7_client_companies(invitation_token);


-- 4. Kommentare zur Dokumentation
-- ============================================

COMMENT ON COLUMN v7_client_companies.status IS 
'Firma-Status: invited (Einladung verschickt), registered (selbst registriert, wartet), active (aktiv), inactive (deaktiviert)';

COMMENT ON COLUMN v7_client_companies.onboarding_type IS 
'Art des Onboardings: by_consultant (vom Berater angelegt) oder self_registration (via Einladungslink)';

COMMENT ON COLUMN v7_client_companies.invitation_token IS 
'UUID-Token für Selbstregistrierung via Einladungslink';


-- ============================================
-- WICHTIG: Diese Migration in Supabase ausführen!
-- ============================================
