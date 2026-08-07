-- ============================================================================
-- PZE - AP-Status-Analyse: Freigabe-Schalter pro Firma
-- Datei: SQL-MIGRATION-ap-analyse-firma-freigabe-v1.sql
-- Version: v1
-- Datum: 06.08.2026
-- ----------------------------------------------------------------------------
-- Zweck: Pro Firma steuern, ob die VERTIEFTE AP-Status-Analyse (Monats-
--        Aufschluesselung je Mitarbeiter + direkter Zugang ausserhalb der
--        Zeiterfassung) im FIRMEN-Portal verfuegbar ist. Default: gesperrt
--        (false). Die BERATER-Seite ist davon unberuehrt und immer frei.
--        Firmen ohne Freigabe sehen weiterhin nur die einfache AP-Uebersicht
--        im Timesheet (ohne Monats-Aufschluesselung).
--
-- Rechte (aktuell): Nur SystemAdmin setzt den Schalter (UI-seitig auf
--        role='system_admin' begrenzt, SystemConfigPanel v7.4.4-4). Analog
--        zum bestehenden vn_firma_freigeschaltet.
--
-- Idempotent: mehrfach ausfuehrbar (IF NOT EXISTS).
-- In DEV UND PROD ausfuehren (identisch).
-- ============================================================================

ALTER TABLE v7_client_companies
  ADD COLUMN IF NOT EXISTS ap_analyse_firma_freigeschaltet boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN v7_client_companies.ap_analyse_firma_freigeschaltet IS
  'Vertiefte AP-Status-Analyse (Monats-Aufschluesselung + externer Zugang) im Firmen-Portal fuer diese Firma freigeschaltet (Default false). Berater-Seite immer frei. Setzen aktuell nur SystemAdmin.';

-- Kontrolle
SELECT id, name, ap_analyse_firma_freigeschaltet
FROM v7_client_companies
ORDER BY name
LIMIT 50;

-- ============================================================================
-- ENDE SQL-MIGRATION-ap-analyse-firma-freigabe-v1.sql
-- ============================================================================
