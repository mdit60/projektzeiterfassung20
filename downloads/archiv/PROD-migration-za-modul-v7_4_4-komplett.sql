-- ============================================================================
-- PZE PROD-Migration: ZA-Modul KOMPLETT
-- Version: v7.4.4 (Patches 1-4 kombiniert)
-- Datum: 03. Maerz 2026
-- ============================================================================
--
-- AUSFUEHREN IN: Supabase SQL Editor -> PROD-DB (projektzeiterfassung)
--                NICHT die Dev-DB!
--
-- ANLEITUNG:
-- 1. Supabase Dashboard oeffnen
-- 2. PROD-Projekt waehlen (projektzeiterfassung)
-- 3. SQL Editor -> New Query
-- 4. Dieses gesamte Skript einfuegen
-- 5. "Run" klicken
-- 6. Pruefen ob alle Befehle ohne Fehler durchlaufen
-- 7. Am Ende die Pruef-Abfragen einzeln ausfuehren
--
-- SICHERHEIT: Alle Befehle sind idempotent (IF NOT EXISTS / DROP IF EXISTS),
-- d.h. das Skript kann gefahrlos mehrfach ausgefuehrt werden.
--
-- INHALT:
-- Teil 1: v7_projects - ZA-Grundfelder (Bescheid, Foerdersatz, Kontakt)
-- Teil 2: v7_projects - Zuschlag T/NT (statt einzelner Zuschlag)
-- Teil 3: v7_projects - Bewilligte Gesamtkosten + Zuwendung
-- Teil 4: v7_project_assignments - hourly_rate_approved
-- Teil 5: v7_project_assignments - Anlage 6.1 projektbezogen
-- Teil 6: v7_payment_requests - Neue Tabelle
-- Teil 7: RLS Policies
-- Teil 8: Datenmigration (bestehende Employee-Daten uebernehmen)
-- ============================================================================


-- ############################################################################
-- TEIL 1: v7_projects - ZA-Grundfelder
-- ############################################################################

ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS zuwendungsbescheid_datum DATE;

ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS za_rhythmus TEXT DEFAULT 'quarterly';

ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS foerdersatz_percent NUMERIC(5,2);

ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS za_schedule JSONB;

ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS za_contact_name TEXT;

ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS za_contact_phone TEXT;

ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS za_contact_email TEXT;


-- ############################################################################
-- TEIL 2: Zuschlag T/NT (zwei getrennte Prozentsaetze)
-- ############################################################################
-- Statt eines einzelnen za_overhead_percent gibt es jetzt:
-- za_overhead_percent_technical    (Zuschlag fuer technische APs)
-- za_overhead_percent_nontechnical (Zuschlag fuer nichttechnische APs)
-- Hintergrund: Im Bescheid koennen die Saetze unterschiedlich sein
-- (z.B. BioInk: T=28,42%, NT=29,88%)
-- ############################################################################

-- Falls das alte Einzelfeld aus der Dev-Migration existiert: umbenennen
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'v7_projects' AND column_name = 'za_overhead_percent'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'v7_projects' AND column_name = 'za_overhead_percent_technical'
  ) THEN
    ALTER TABLE v7_projects RENAME COLUMN za_overhead_percent TO za_overhead_percent_technical;
  END IF;
END $$;

ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS za_overhead_percent_technical NUMERIC(5,2);

ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS za_overhead_percent_nontechnical NUMERIC(5,2);

-- Falls technisch gefuellt aber nichttechnisch leer: gleichen Wert uebernehmen
UPDATE v7_projects
SET za_overhead_percent_nontechnical = za_overhead_percent_technical
WHERE za_overhead_percent_technical IS NOT NULL
  AND za_overhead_percent_nontechnical IS NULL;


-- ############################################################################
-- TEIL 3: Bewilligte Gesamtkosten und Zuwendung
-- ############################################################################

ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS bewilligte_gesamtkosten NUMERIC(14,2);

ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS bewilligte_zuwendung NUMERIC(14,2);


-- ############################################################################
-- TEIL 4: v7_project_assignments - Bewilligter Stundensatz
-- ############################################################################

ALTER TABLE v7_project_assignments
  ADD COLUMN IF NOT EXISTS hourly_rate_approved NUMERIC(8,2);

COMMENT ON COLUMN v7_project_assignments.hourly_rate_approved IS
  'Bewilligter Stundensatz lt. VDI/VDE-Bescheid. NULL = kalkulatorischer Stundensatz wird verwendet.';


-- ############################################################################
-- TEIL 5: v7_project_assignments - Anlage 6.1 Felder projektbezogen
-- ############################################################################
-- Gehalts- und Arbeitszeitdaten gehoeren in die Projekt-Zuordnung,
-- weil ein MA in verschiedenen Projekten unterschiedliche Werte haben kann.
-- ############################################################################

ALTER TABLE v7_project_assignments
  ADD COLUMN IF NOT EXISTS monthly_gross_salary NUMERIC(10,2);

ALTER TABLE v7_project_assignments
  ADD COLUMN IF NOT EXISTS additional_salary_components NUMERIC(10,2) DEFAULT 0;

ALTER TABLE v7_project_assignments
  ADD COLUMN IF NOT EXISTS personal_weekly_hours NUMERIC(4,1);

ALTER TABLE v7_project_assignments
  ADD COLUMN IF NOT EXISTS company_weekly_hours NUMERIC(4,1) DEFAULT 40.0;

COMMENT ON COLUMN v7_project_assignments.monthly_gross_salary IS
  'Fix-Monatsbruttolohn zum Zeitpunkt der Antragstellung (Anlage 6.1)';

COMMENT ON COLUMN v7_project_assignments.additional_salary_components IS
  'Weitere fixe Gehaltsbestandteile lt. Anlage 6.1a (Weihnachtsgeld etc.), meist 0';

COMMENT ON COLUMN v7_project_assignments.personal_weekly_hours IS
  'pWAZ: Persoenliche Wochenarbeitszeit lt. Arbeitsvertrag (kann Teilzeit sein)';

COMMENT ON COLUMN v7_project_assignments.company_weekly_hours IS
  'bWAZ: Betriebsuebliche Wochenarbeitszeit Vollzeit (i.d.R. 40h)';


-- ############################################################################
-- TEIL 6: Neue Tabelle v7_payment_requests
-- ############################################################################

CREATE TABLE IF NOT EXISTS v7_payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,
    za_number INTEGER NOT NULL,
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    total_hours NUMERIC(10,2),
    total_personnel_costs NUMERIC(14,2),
    overhead_percent NUMERIC(5,2),
    overhead_amount NUMERIC(14,2),
    foerdersatz_percent NUMERIC(5,2),
    total_funding_amount NUMERIC(14,2),
    status TEXT NOT NULL DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    za_data JSONB,
    created_by UUID REFERENCES v7_user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT v7_payment_requests_unique UNIQUE(project_id, za_number)
);

CREATE INDEX IF NOT EXISTS idx_v7_payment_requests_project
  ON v7_payment_requests(project_id);

CREATE INDEX IF NOT EXISTS idx_v7_payment_requests_status
  ON v7_payment_requests(status);

-- Updated-Trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'v7_payment_requests_updated'
  ) THEN
    CREATE TRIGGER v7_payment_requests_updated
      BEFORE UPDATE ON v7_payment_requests
      FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();
  END IF;
END $$;


-- ############################################################################
-- TEIL 7: RLS (Row Level Security) fuer v7_payment_requests
-- ############################################################################

ALTER TABLE v7_payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consultant_payment_requests_select" ON v7_payment_requests;
CREATE POLICY "consultant_payment_requests_select"
  ON v7_payment_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM v7_projects p
      JOIN v7_client_companies cc ON p.client_company_id = cc.id
      JOIN v7_consultant_access ca ON ca.client_company_id = cc.id
      JOIN v7_user_profiles up ON up.id = ca.consultant_user_id
      WHERE p.id = v7_payment_requests.project_id
        AND up.id = auth.uid()
        AND ca.is_active = true
    )
  );

DROP POLICY IF EXISTS "consultant_payment_requests_all" ON v7_payment_requests;
CREATE POLICY "consultant_payment_requests_all"
  ON v7_payment_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM v7_projects p
      JOIN v7_client_companies cc ON p.client_company_id = cc.id
      JOIN v7_consultant_access ca ON ca.client_company_id = cc.id
      JOIN v7_user_profiles up ON up.id = ca.consultant_user_id
      WHERE p.id = v7_payment_requests.project_id
        AND up.id = auth.uid()
        AND ca.is_active = true
        AND ca.can_edit = true
    )
  );

DROP POLICY IF EXISTS "client_payment_requests_select" ON v7_payment_requests;
CREATE POLICY "client_payment_requests_select"
  ON v7_payment_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM v7_projects p
      JOIN v7_client_companies cc ON p.client_company_id = cc.id
      JOIN v7_user_profiles up ON up.client_company_id = cc.id
      WHERE p.id = v7_payment_requests.project_id
        AND up.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "client_admin_payment_requests_all" ON v7_payment_requests;
CREATE POLICY "client_admin_payment_requests_all"
  ON v7_payment_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM v7_projects p
      JOIN v7_client_companies cc ON p.client_company_id = cc.id
      JOIN v7_user_profiles up ON up.client_company_id = cc.id
      JOIN v7_employees emp ON emp.user_id = up.id
      WHERE p.id = v7_payment_requests.project_id
        AND up.id = auth.uid()
        AND emp.portal_role IN ('client_admin', 'project_leader')
    )
  );


-- ############################################################################
-- TEIL 8: Datenmigration
-- ############################################################################
-- Bestehende Gehalts-/Arbeitszeitdaten aus v7_employees
-- in die v7_project_assignments uebernehmen (einmalig)
-- ############################################################################

UPDATE v7_project_assignments pa
SET
  monthly_gross_salary = ROUND(e.annual_salary / 12, 2),
  personal_weekly_hours = COALESCE(e.weekly_hours, 40),
  company_weekly_hours = COALESCE(e.company_weekly_hours, 40)
FROM v7_employees e
WHERE pa.employee_id = e.id
  AND e.annual_salary IS NOT NULL
  AND pa.monthly_gross_salary IS NULL;


-- ############################################################################
-- FERTIG!
-- ############################################################################
--
-- PRUEF-ABFRAGEN (einzeln ausfuehren):
--
-- 1) ZA-Felder in v7_projects:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'v7_projects'
--   AND column_name LIKE 'za_%' OR column_name LIKE 'bewilligte%'
--      OR column_name IN ('zuwendungsbescheid_datum', 'foerdersatz_percent')
-- ORDER BY column_name;
-- -> Erwartet: 12 Zeilen
--
-- 2) Anlage 6.1 Felder in v7_project_assignments:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'v7_project_assignments'
--   AND column_name IN ('hourly_rate', 'hourly_rate_approved',
--       'monthly_gross_salary', 'additional_salary_components',
--       'personal_weekly_hours', 'company_weekly_hours')
-- ORDER BY column_name;
-- -> Erwartet: 6 Zeilen
--
-- 3) Neue Tabelle:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'v7_payment_requests'
-- ORDER BY ordinal_position;
-- -> Erwartet: 17 Zeilen
--
-- 4) Migrierte Daten pruefen:
-- SELECT pa.employee_id, e.display_name,
--   pa.monthly_gross_salary, pa.personal_weekly_hours, pa.hourly_rate
-- FROM v7_project_assignments pa
-- JOIN v7_employees e ON e.id = pa.employee_id
-- WHERE pa.monthly_gross_salary IS NOT NULL
-- ORDER BY e.display_name;
-- ############################################################################
