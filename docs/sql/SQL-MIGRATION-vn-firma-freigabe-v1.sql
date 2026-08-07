-- ============================================================================
-- PZE - Verwendungsnachweis: Freigabe-Schalter pro Firma
-- Datei: SQL-MIGRATION-vn-firma-freigabe-v1.sql
-- ----------------------------------------------------------------------------
-- Zweck: Pro Firma steuern, ob der Verwendungsnachweis (VN) im FIRMEN-Portal
--        (fuer Firmen-Admins) sichtbar/nutzbar ist. Default: gesperrt (false).
--        Die BERATER-Seite ist davon unberuehrt und immer frei (zum Testen).
--
-- Rechte (aktuell): Nur SystemAdmin setzt den Schalter (UI-seitig auf
--        role='system_admin' begrenzt). Spaeter kann die Freigabe optional an
--        den zustaendigen Berater erweitert werden - das Datenmodell bleibt
--        gleich, nur die Schreib-Berechtigung (UI/RLS) wuerde erweitert.
--
-- Idempotent: mehrfach ausfuehrbar (IF NOT EXISTS).
-- In DEV UND PROD ausfuehren.
-- ============================================================================

ALTER TABLE v7_client_companies
  ADD COLUMN IF NOT EXISTS vn_firma_freigeschaltet boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN v7_client_companies.vn_firma_freigeschaltet IS
  'VN im Firmen-Portal fuer diese Firma freigeschaltet (Default false). Berater-Seite immer frei. Setzen aktuell nur SystemAdmin.';

-- Kontrolle
SELECT id, name, vn_firma_freigeschaltet
FROM v7_client_companies
ORDER BY name
LIMIT 50;

-- ============================================================================
-- ENDE SQL-MIGRATION-vn-firma-freigabe-v1.sql
-- ============================================================================
