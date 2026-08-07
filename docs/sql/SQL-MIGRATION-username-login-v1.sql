-- ============================================================================
-- PZE V7 - Migration: Username-Login
-- ============================================================================
-- Datum: 05. Juli 2026
-- Zweck: Optionaler, global eindeutiger Benutzername als Alternative zur
--   E-Mail-Adresse beim Login (Login-Seite akzeptiert E-Mail ODER Benutzername).
--
-- WICHTIG: Auf BEIDEN Datenbanken ausfuehren, damit DEV und PROD symmetrisch
--   bleiben:
--   DEV:  jaiyycmstgepxaqsvnjd
--   PROD: cnnuyioklhlrfygwticf
--
-- Voraussetzung: Da die Spalte neu ist, gibt es keine Bestandsdaten und somit
--   keine Kollisionsgefahr - eine vorherige Kollisions-Pruefquery ist hier
--   NICHT erforderlich (anders als z.B. bei Stufe-2-DB-Absicherung auf
--   v7_timesheets).
-- ============================================================================

-- 1. Spalte hinzufuegen (nullable - nicht jeder Mitarbeiter braucht einen
--    Benutzernamen)
ALTER TABLE v7_user_profiles
  ADD COLUMN IF NOT EXISTS username text;

-- 2. Format-Pruefung: 3-20 Zeichen, ausschliesslich Kleinbuchstaben, Ziffern,
--    Punkt, Unterstrich, Bindestrich. Die Anwendung speichert Benutzernamen
--    immer kleingeschrieben, daher reicht diese Pruefung fuer Eindeutigkeit
--    ohne Gross-/Kleinschreibungs-Sonderfaelle.
ALTER TABLE v7_user_profiles
  ADD CONSTRAINT v7_user_profiles_username_format
  CHECK (username IS NULL OR username ~ '^[a-z0-9._-]{3,20}$');

-- 3. Eindeutigkeit global (ueber alle Firmen hinweg), aber nur fuer befuellte
--    Werte - ein Partial-Unique-Index laesst beliebig viele NULL-Werte zu.
CREATE UNIQUE INDEX IF NOT EXISTS v7_user_profiles_username_unique
  ON v7_user_profiles (username)
  WHERE username IS NOT NULL;

-- ============================================================================
-- ENDE SQL-MIGRATION-username-login-v1.sql
-- ============================================================================
