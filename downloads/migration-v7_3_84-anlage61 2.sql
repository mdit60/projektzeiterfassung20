-- ============================================
-- MIGRATION: v7.3.84 - Anlage 6.1 Felder
-- Datum: 24. Januar 2026
-- ============================================
-- Fuegt fehlende Felder fuer ZIM Anlage 6.1 hinzu
-- Ermoeglicht vollstaendige Erfassung der Mitarbeiterdaten
-- ============================================

-- Neue Spalten hinzufuegen
ALTER TABLE v7_employees 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS education_degree TEXT,
ADD COLUMN IF NOT EXISTS education_year INTEGER,
ADD COLUMN IF NOT EXISTS annual_salary NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS company_weekly_hours NUMERIC(4,1) DEFAULT 40.0,
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(8,2),
ADD COLUMN IF NOT EXISTS employee_number INTEGER;

-- Kommentare fuer Dokumentation
COMMENT ON COLUMN v7_employees.birth_date IS 'Geburtsdatum (Anlage 6.1)';
COMMENT ON COLUMN v7_employees.education_degree IS 'Bildungsabschluss und Fachrichtung (Anlage 6.1)';
COMMENT ON COLUMN v7_employees.education_year IS 'Jahr des Ausbildungsabschlusses (Anlage 6.1)';
COMMENT ON COLUMN v7_employees.annual_salary IS 'Jahresbruttolohn/-gehalt in Euro (Anlage 6.1)';
COMMENT ON COLUMN v7_employees.company_weekly_hours IS 'Betriebsuebliche Wochenarbeitszeit bWAZ (Anlage 6.1)';
COMMENT ON COLUMN v7_employees.hourly_rate IS 'Berechneter Stundensatz: annual_salary / (weekly_hours * 52)';
COMMENT ON COLUMN v7_employees.employee_number IS 'Laufende Nummer fuer Excel-Import (entspricht lfd. Nr. in Anlage 6.1)';

-- Index fuer employee_number (fuer schnelles Matching beim Import)
CREATE INDEX IF NOT EXISTS idx_v7_employees_number ON v7_employees(client_company_id, employee_number);

-- ============================================
-- UEBERSICHT: Alle v7_employees Felder nach Migration
-- ============================================
-- 
-- IDENTIFIKATION:
--   id                    UUID (PK)
--   client_company_id     UUID (FK)
--   user_id               UUID (optional, Auth-User)
--   employee_number       INTEGER (lfd. Nr. fuer Excel)
--
-- NAMEN:
--   display_name          TEXT "Nachname, Vorname"
--   first_name            TEXT
--   last_name             TEXT
--   name                  TEXT "Vorname Nachname"
--
-- KONTAKT:
--   email                 TEXT
--
-- PERSOENLICHE DATEN (Anlage 6.1):
--   birth_date            DATE
--   education_degree      TEXT (z.B. "Dipl.-Ing. Maschinenbau")
--   education_year        INTEGER (z.B. 1999)
--
-- ARBEITSVERHAELTNIS:
--   qualification         TEXT (Ingenieur, Techniker, Hilfskraft, Sonstige)
--   position_title        TEXT (Funktion/Arbeitsgebiet)
--   position              TEXT (alternativ)
--   weekly_hours          NUMERIC(4,1) (pWAZ - persoenliche Wochenarbeitszeit)
--   company_weekly_hours  NUMERIC(4,1) (bWAZ - betriebsueblich)
--   annual_leave_days     INTEGER
--
-- GEHALT/KOSTEN (Anlage 6.1):
--   annual_salary         NUMERIC(10,2) (Jahresbrutto)
--   hourly_rate           NUMERIC(8,2) (berechnet)
--
-- BESCHAEFTIGUNGSZEITRAUM:
--   employment_start      DATE (Angestellt seit)
--   employment_end        DATE
--   entry_date            DATE (alternativ)
--   exit_date             DATE (alternativ)
--
-- SONSTIGES:
--   notes                 TEXT
--   is_active             BOOLEAN
--   created_at            TIMESTAMPTZ
--   updated_at            TIMESTAMPTZ
--
-- ============================================
