-- ============================================================================
-- SQL-MIGRATION: v7_nwm_blocked_periods
-- Datei: SQL-MIGRATION-nwm-blocked-periods-v1.sql
-- Datum: 1. Juni 2026
-- Zweck: Tagessperren fuer NWM-Projekte (A-021).
--        Admin/PL kann fuer ausgewaehlte MA Zeitraeume blockieren,
--        in denen keine NWM-Stunden gebucht werden koennen.
-- Ausfuehren in: Supabase SQL-Editor (erst DEV, dann PROD)
-- ============================================================================

-- Tabelle anlegen
CREATE TABLE IF NOT EXISTS v7_nwm_blocked_periods (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,
  employee_id UUID        NOT NULL REFERENCES v7_employees(id) ON DELETE CASCADE,
  start_date  DATE        NOT NULL,
  end_date    DATE        NOT NULL,
  reason      TEXT,
  created_by  UUID        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Indizes fuer effiziente Abfragen
CREATE INDEX IF NOT EXISTS idx_nwm_blocked_project_employee
  ON v7_nwm_blocked_periods(project_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_nwm_blocked_dates
  ON v7_nwm_blocked_periods(start_date, end_date);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE v7_nwm_blocked_periods ENABLE ROW LEVEL SECURITY;

-- Lesen: alle eingeloggten Nutzer (MA muss eigene Sperren sehen)
CREATE POLICY "nwm_blocked_read_all"
  ON v7_nwm_blocked_periods FOR SELECT
  TO authenticated
  USING (true);

-- Schreiben: system_admin + consultant (Berater = Admin fuer Projekte)
CREATE POLICY "nwm_blocked_write_admin"
  ON v7_nwm_blocked_periods FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM v7_user_profiles
      WHERE id = auth.uid() AND role IN ('system_admin', 'consultant')
    )
  );

CREATE POLICY "nwm_blocked_delete_admin"
  ON v7_nwm_blocked_periods FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM v7_user_profiles
      WHERE id = auth.uid() AND role IN ('system_admin', 'consultant')
    )
  );

-- ============================================================================
-- Kontrolle nach Ausfuehrung:
-- SELECT * FROM v7_nwm_blocked_periods LIMIT 5;
-- Ergebnis: leere Tabelle, keine Fehler
-- ============================================================================
