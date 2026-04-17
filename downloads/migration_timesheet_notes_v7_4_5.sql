-- ============================================================================
-- PZE V7 - Migration: Timesheet Notes (Interne Rueckfragen)
-- ============================================================================
-- Datum: 17. April 2026
-- Version: v7.4.5
--
-- Neue Tabelle v7_timesheet_notes:
-- Interne Notizen/Rueckfragen pro MA/Projekt/Monat
-- Nur sichtbar fuer PL, Admin und Berater (MA sieht nichts)
-- Status: 'offen' oder 'erledigt'
--
-- Ausfuehren in: DEV (projektzeiterfassung20) UND PROD (PZE-production)
-- ============================================================================

-- 1. Tabelle erstellen
CREATE TABLE IF NOT EXISTS v7_timesheet_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES v7_employees(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  note_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'erledigt')),
  created_by UUID REFERENCES v7_user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES v7_user_profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Unique Constraint: Maximal eine Notiz pro MA/Projekt/Monat
ALTER TABLE v7_timesheet_notes
  ADD CONSTRAINT v7_timesheet_notes_unique
  UNIQUE (employee_id, project_id, year, month);

-- 3. Index fuer schnelle Abfragen offener Notizen
CREATE INDEX IF NOT EXISTS idx_v7_timesheet_notes_status
  ON v7_timesheet_notes (status)
  WHERE status = 'offen';

-- 4. Index fuer Abfragen nach Projekt
CREATE INDEX IF NOT EXISTS idx_v7_timesheet_notes_project
  ON v7_timesheet_notes (project_id, year, month);

-- 5. RLS deaktiviert (wie alle v7-Tabellen aktuell)
ALTER TABLE v7_timesheet_notes DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Pruefung nach Ausfuehrung:
-- SELECT * FROM v7_timesheet_notes LIMIT 1;
-- ============================================================================
