-- ============================================================================
-- SQL: Cockpit-Freischaltung Config-Eintraege
-- Ausfuehren auf: DEV + PROD (Supabase SQL Editor)
-- ============================================================================

-- Cockpit fuer Berater (default: false = nur system_admin sieht es)
INSERT INTO v7_system_config (key, value, updated_at, updated_by)
VALUES ('cockpit_berater_enabled', 'false', NOW(), 'system')
ON CONFLICT (key) DO NOTHING;

-- Cockpit fuer Firmen-Portal (default: false = ausgeblendet)
INSERT INTO v7_system_config (key, value, updated_at, updated_by)
VALUES ('cockpit_firma_enabled', 'false', NOW(), 'system')
ON CONFLICT (key) DO NOTHING;

-- Kontrolle
SELECT key, value, updated_at, updated_by
FROM v7_system_config
ORDER BY key;
