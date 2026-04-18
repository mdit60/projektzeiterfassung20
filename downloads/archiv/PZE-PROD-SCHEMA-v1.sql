-- ============================================================
-- PZE PRODUKTIV-DATENBANK SCHEMA
-- Version: 1.0
-- Datum: 16. Februar 2026
-- Quelle: Export aus Dev-DB (projektzeiterfassung20)
-- ============================================================
-- ANLEITUNG:
-- 1. Neues Supabase-Projekt anlegen
-- 2. SQL Editor oeffnen
-- 3. Dieses Script komplett einfuegen und ausfuehren
-- 4. Ggf. in Bloecken ausfuehren falls Timeout
-- ============================================================

-- ============================================================
-- TEIL 1: ENUM-TYPEN
-- ============================================================

-- Funding-Format Enum
DO $$ BEGIN
  CREATE TYPE v7_funding_format AS ENUM (
    'ZIM', 'BMBF', 'FZul', 'Horizon', 'EFRE', 'Landesprogramm', 'Sonstige'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Day-Type Enum
DO $$ BEGIN
  CREATE TYPE v7_day_type AS ENUM (
    'work', 'vacation', 'sick', 'holiday', 'special_leave', 'weekend'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Data-Source Enum
DO $$ BEGIN
  CREATE TYPE v7_data_source AS ENUM (
    'manual', 'excel_import', 'csv_import', 'api', 'zim_import'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User-Role Enum
DO $$ BEGIN
  CREATE TYPE v7_user_role AS ENUM (
    'system_admin', 'consultant', 'client_user'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- TEIL 2: TABELLEN (in Reihenfolge der Abhaengigkeiten)
-- ============================================================

-- ----------------------------------------------------------
-- 2.1 Beraterfirmen
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS v7_consultant_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT,
  street TEXT,
  zip_code TEXT,
  city TEXT,
  federal_state TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  tax_id TEXT,
  internal_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------
-- 2.2 Kundenfirmen
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS v7_client_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_company_id UUID NOT NULL REFERENCES v7_consultant_companies(id),
  name TEXT NOT NULL,
  short_name TEXT,
  street TEXT,
  zip_code TEXT,
  city TEXT,
  federal_state TEXT NOT NULL DEFAULT 'DE-BW',
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  internal_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active',
  onboarding_type TEXT,
  invited_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ,
  invitation_token UUID DEFAULT gen_random_uuid(),
  invitation_expires_at TIMESTAMPTZ,
  vat_id TEXT,
  website TEXT,
  logo_url TEXT,
  legal_name TEXT,
  kmu_status VARCHAR,
  founding_year INTEGER,
  industry_sector VARCHAR,
  employee_count INTEGER,
  annual_revenue NUMERIC,
  balance_sheet_total NUMERIC,
  commercial_register VARCHAR
);

-- ----------------------------------------------------------
-- 2.3 User-Profile
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS v7_user_profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  role v7_user_role NOT NULL DEFAULT 'client_user',
  consultant_company_id UUID REFERENCES v7_consultant_companies(id),
  client_company_id UUID REFERENCES v7_client_companies(id),
  is_active BOOLEAN DEFAULT true,
  invited_by UUID,
  invited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------
-- 2.4 Berater-Zugang zu Kundenfirmen
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS v7_consultant_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_user_id UUID NOT NULL,
  client_company_id UUID NOT NULL REFERENCES v7_client_companies(id),
  authorized_by UUID,
  authorized_at TIMESTAMPTZ DEFAULT now(),
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT true,
  can_export BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------
-- 2.5 Mitarbeiter
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS v7_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_company_id UUID NOT NULL REFERENCES v7_client_companies(id),
  user_id UUID,
  display_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  weekly_hours NUMERIC DEFAULT 40.0,
  annual_leave_days INTEGER DEFAULT 30,
  position_title TEXT,
  qualification TEXT,
  employment_start DATE,
  employment_end DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  email TEXT,
  position TEXT,
  name TEXT,
  entry_date DATE,
  exit_date DATE,
  portal_role TEXT DEFAULT 'employee',
  birth_date DATE,
  education_degree TEXT,
  education_year INTEGER,
  annual_salary NUMERIC,
  company_weekly_hours NUMERIC DEFAULT 40.0,
  hourly_rate NUMERIC,
  employee_number INTEGER
);

-- ----------------------------------------------------------
-- 2.6 Projekte
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS v7_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_company_id UUID NOT NULL REFERENCES v7_client_companies(id),
  name TEXT NOT NULL,
  short_name TEXT,
  funding_reference TEXT,
  funding_format v7_funding_format NOT NULL DEFAULT 'ZIM',
  start_date DATE,
  end_date DATE,
  fzul_vorhaben_title TEXT,
  fzul_vorhaben_id TEXT,
  source_filename TEXT,
  imported_at TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  project_contact_name TEXT,
  project_contact_email TEXT,
  project_contact_phone TEXT,
  project_contact_position TEXT,
  company_employee_count INTEGER,
  company_revenue_previous_year NUMERIC,
  company_balance_sheet_total NUMERIC,
  company_founding_year INTEGER,
  kmu_status TEXT,
  kmu_declaration_date DATE,
  company_data_reference_date DATE,
  company_shareholders TEXT,
  company_affiliated_enterprises TEXT,
  funding_quota NUMERIC,
  funding_amount_approved NUMERIC,
  funding_amount_requested NUMERIC,
  total_project_cost NUMERIC,
  is_consortium_project BOOLEAN DEFAULT false,
  consortium_partners JSONB,
  consortium_role TEXT,
  project_summary TEXT,
  project_goals TEXT,
  application_date DATE,
  approval_date DATE,
  project_status TEXT DEFAULT 'active'
);

-- ----------------------------------------------------------
-- 2.7 Projekt-Budget
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS v7_project_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES v7_projects(id),
  total_costs NUMERIC,
  personnel_costs NUMERIC,
  material_costs NUMERIC,
  subcontract_costs NUMERIC,
  overhead_costs NUMERIC,
  funding_rate NUMERIC,
  funding_amount NUMERIC,
  own_contribution NUMERIC,
  duration_months INTEGER,
  total_person_months NUMERIC,
  source_filename TEXT,
  imported_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------
-- 2.8 Arbeitspakete
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS v7_work_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES v7_projects(id),
  ap_number INTEGER NOT NULL,
  ap_code TEXT,
  name TEXT NOT NULL,
  start_month INTEGER,
  end_month INTEGER,
  start_date DATE,
  end_date DATE,
  total_person_months NUMERIC,
  total_costs NUMERIC,
  description TEXT,
  deliverables TEXT,
  source_filename TEXT,
  imported_at TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_technical BOOLEAN DEFAULT true,
  ap_sub_number INTEGER DEFAULT 0,
  ap_sub_sub_number INTEGER,
  ap_level_4 INTEGER
);

-- ----------------------------------------------------------
-- 2.9 Projekt-Zuordnungen (MA zu Projekt)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS v7_project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES v7_projects(id),
  employee_id UUID NOT NULL REFERENCES v7_employees(id),
  role_in_project TEXT,
  fue_percentage NUMERIC DEFAULT 100.00,
  assignment_start DATE,
  assignment_end DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  hourly_rate NUMERIC,
  is_project_leader BOOLEAN DEFAULT false,
  employee_number INTEGER
);

-- ----------------------------------------------------------
-- 2.10 Arbeitspaket-Zuordnungen (MA zu AP)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS v7_work_package_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_package_id UUID NOT NULL REFERENCES v7_work_packages(id),
  employee_id UUID NOT NULL REFERENCES v7_employees(id),
  planned_person_months NUMERIC,
  planned_hours NUMERIC,
  planned_costs NUMERIC,
  hourly_rate NUMERIC,
  role_description TEXT,
  actual_hours NUMERIC,
  actual_costs NUMERIC,
  source_filename TEXT,
  imported_at TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------
-- 2.11 Projekt-Team
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS v7_project_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES v7_projects(id),
  employee_id UUID NOT NULL REFERENCES v7_employees(id),
  employee_number INTEGER,
  role_in_project TEXT,
  hourly_rate_override NUMERIC,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------
-- 2.12 Zeiterfassung
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS v7_timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES v7_employees(id),
  project_id UUID REFERENCES v7_projects(id),
  work_date DATE NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0,
  day_type v7_day_type DEFAULT 'work',
  data_source v7_data_source NOT NULL DEFAULT 'manual',
  source_filename TEXT,
  source_row INTEGER,
  imported_at TIMESTAMPTZ,
  imported_by UUID,
  entered_by UUID,
  entered_at TIMESTAMPTZ,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  work_package_id UUID REFERENCES v7_work_packages(id),
  absence_code TEXT,
  is_billable BOOLEAN DEFAULT true,
  notes TEXT,
  is_technical BOOLEAN
);

-- ----------------------------------------------------------
-- 2.13 FZul-Zeiterfassung
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS v7_fzul_timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES v7_employees(id),
  client_company_id UUID NOT NULL REFERENCES v7_client_companies(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  available_hours NUMERIC DEFAULT 0,
  booked_hours NUMERIC DEFAULT 0,
  day_code TEXT DEFAULT 'A',
  based_on_source v7_data_source,
  is_edited BOOLEAN DEFAULT false,
  edited_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------
-- 2.14 Daten-Vollstaendigkeit
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS v7_data_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_company_id UUID NOT NULL REFERENCES v7_client_companies(id),
  year INTEGER NOT NULL,
  data_source v7_data_source NOT NULL,
  is_complete BOOLEAN DEFAULT false,
  is_released BOOLEAN DEFAULT false,
  released_by UUID,
  released_at TIMESTAMPTZ,
  preferred_for_analysis BOOLEAN DEFAULT false,
  preferred_set_by UUID,
  preferred_set_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------
-- 2.15 Archiv
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS v7_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_company_id UUID NOT NULL REFERENCES v7_client_companies(id),
  employee_id UUID,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_data BYTEA,
  file_size INTEGER,
  year INTEGER,
  based_on_source v7_data_source,
  generated_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- TEIL 3: VIEWS
-- ============================================================

-- ----------------------------------------------------------
-- 3.1 Mitarbeiter mit Projekten
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW v7_employees_with_projects AS
SELECT
  e.*,
  (
    SELECT json_agg(json_build_object(
      'project_id', p.id,
      'project_name', p.name,
      'role', pa.role_in_project,
      'is_project_leader', pa.is_project_leader
    ))
    FROM v7_project_assignments pa
    JOIN v7_projects p ON p.id = pa.project_id
    WHERE pa.employee_id = e.id AND pa.is_active = true
  ) AS assigned_projects
FROM v7_employees e;

-- ----------------------------------------------------------
-- 3.2 Projekt-Uebersicht
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW v7_project_overview AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.funding_reference AS fkz,
  p.funding_format,
  p.start_date,
  p.end_date,
  p.client_company_id,
  cc.name AS client_company_name,
  (SELECT COUNT(*) FROM v7_work_packages wp WHERE wp.project_id = p.id AND wp.is_active = true) AS work_package_count,
  (SELECT COUNT(DISTINCT pa2.employee_id) FROM v7_project_assignments pa2 WHERE pa2.project_id = p.id AND pa2.is_active = true) AS employee_count,
  pb.total_person_months AS total_pm,
  pb.total_costs,
  pb.funding_amount,
  pb.funding_rate
FROM v7_projects p
LEFT JOIN v7_client_companies cc ON cc.id = p.client_company_id
LEFT JOIN v7_project_budget pb ON pb.project_id = p.id;

-- ----------------------------------------------------------
-- 3.3 Projekte mit Firma
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW v7_projects_with_company AS
SELECT
  p.*,
  cc.name AS company_name,
  cc.short_name AS company_short_name,
  cc.city AS company_city,
  cc.federal_state AS company_federal_state,
  cc.contact_person AS company_contact_person,
  cc.contact_email AS company_contact_email
FROM v7_projects p
LEFT JOIN v7_client_companies cc ON cc.id = p.client_company_id;

-- ----------------------------------------------------------
-- 3.4 Projekte mit Projektleiter
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW v7_projects_with_leader AS
SELECT
  p.*,
  pl.employee_id AS project_leader_id,
  e.display_name AS project_leader_name,
  e.email AS project_leader_email
FROM v7_projects p
LEFT JOIN (
  SELECT project_id, employee_id
  FROM v7_project_assignments
  WHERE is_project_leader = true AND is_active = true
) pl ON pl.project_id = p.id
LEFT JOIN v7_employees e ON e.id = pl.employee_id;

-- ----------------------------------------------------------
-- 3.5 Tages-Zeiterfassung
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW v7_timesheet_daily AS
SELECT
  t.id,
  t.employee_id,
  e.display_name AS employee_name,
  e.client_company_id,
  t.work_date,
  EXTRACT(YEAR FROM t.work_date)::INTEGER AS year,
  EXTRACT(MONTH FROM t.work_date)::INTEGER AS month,
  EXTRACT(DAY FROM t.work_date)::INTEGER AS day,
  to_char(t.work_date, 'Dy') AS day_name,
  EXTRACT(DOW FROM t.work_date)::INTEGER AS day_of_week,
  t.work_package_id,
  wp.ap_code,
  wp.name AS wp_name,
  t.project_id,
  p.name AS project_name,
  p.funding_reference,
  t.hours,
  t.is_billable,
  t.absence_code,
  t.notes,
  t.day_type,
  t.data_source,
  t.entered_by,
  t.entered_at,
  t.created_at,
  t.updated_at
FROM v7_timesheets t
JOIN v7_employees e ON e.id = t.employee_id
LEFT JOIN v7_work_packages wp ON wp.id = t.work_package_id
LEFT JOIN v7_projects p ON p.id = t.project_id
WHERE t.is_active = true;

-- ----------------------------------------------------------
-- 3.6 Monats-Zusammenfassung
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW v7_timesheet_monthly_summary AS
SELECT
  t.employee_id,
  e.display_name AS employee_name,
  e.client_company_id,
  EXTRACT(YEAR FROM t.work_date)::INTEGER AS year,
  EXTRACT(MONTH FROM t.work_date)::INTEGER AS month,
  t.work_package_id,
  wp.ap_code,
  wp.name AS wp_name,
  t.project_id,
  p.name AS project_name,
  p.funding_reference,
  SUM(CASE WHEN t.is_billable = true THEN t.hours ELSE 0 END) AS billable_hours,
  SUM(CASE WHEN t.is_billable = false THEN t.hours ELSE 0 END) AS non_billable_hours,
  COUNT(CASE WHEN t.day_type = 'vacation' THEN 1 END) AS vacation_days,
  COUNT(CASE WHEN t.day_type = 'sick' THEN 1 END) AS sick_days,
  COUNT(CASE WHEN t.day_type = 'special_leave' THEN 1 END) AS special_leave_days,
  COUNT(CASE WHEN t.day_type = 'holiday' THEN 1 END) AS holiday_days
FROM v7_timesheets t
JOIN v7_employees e ON e.id = t.employee_id
LEFT JOIN v7_work_packages wp ON wp.id = t.work_package_id
LEFT JOIN v7_projects p ON p.id = t.project_id
WHERE t.is_active = true
GROUP BY t.employee_id, e.display_name, e.client_company_id,
  EXTRACT(YEAR FROM t.work_date), EXTRACT(MONTH FROM t.work_date),
  t.work_package_id, wp.ap_code, wp.name,
  t.project_id, p.name, p.funding_reference;

-- ----------------------------------------------------------
-- 3.7 Arbeitspaket-Details
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW v7_work_package_details AS
SELECT
  wp.id AS work_package_id,
  wp.project_id,
  wp.ap_number,
  wp.ap_sub_number,
  wp.ap_code,
  wp.name AS wp_name,
  wp.start_month,
  wp.end_month,
  wp.total_person_months AS wp_total_pm,
  wpa.employee_id,
  e.display_name AS employee_name,
  e.qualification,
  wpa.planned_person_months,
  wpa.planned_hours,
  wpa.hourly_rate,
  wpa.planned_costs,
  wpa.actual_hours,
  wpa.actual_costs
FROM v7_work_packages wp
LEFT JOIN v7_work_package_assignments wpa ON wpa.work_package_id = wp.id AND wpa.is_active = true
LEFT JOIN v7_employees e ON e.id = wpa.employee_id
WHERE wp.is_active = true;


-- ============================================================
-- TEIL 4: INDIZES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_client_companies_consultant ON v7_client_companies(consultant_company_id);
CREATE INDEX IF NOT EXISTS idx_employees_company ON v7_employees(client_company_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON v7_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_company ON v7_projects(client_company_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project ON v7_project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_employee ON v7_project_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_packages_project ON v7_work_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_wpa_work_package ON v7_work_package_assignments(work_package_id);
CREATE INDEX IF NOT EXISTS idx_wpa_employee ON v7_work_package_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_employee ON v7_timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_project ON v7_timesheets(project_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_work_date ON v7_timesheets(work_date);
CREATE INDEX IF NOT EXISTS idx_timesheets_wp ON v7_timesheets(work_package_id);
CREATE INDEX IF NOT EXISTS idx_fzul_employee ON v7_fzul_timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_fzul_company ON v7_fzul_timesheets(client_company_id);
CREATE INDEX IF NOT EXISTS idx_consultant_access_user ON v7_consultant_access(consultant_user_id);
CREATE INDEX IF NOT EXISTS idx_consultant_access_company ON v7_consultant_access(client_company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON v7_user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_project_team_project ON v7_project_team(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_employee ON v7_project_team(employee_id);
CREATE INDEX IF NOT EXISTS idx_data_completion_company ON v7_data_completion(client_company_id);
CREATE INDEX IF NOT EXISTS idx_archive_company ON v7_archive(client_company_id);


-- ============================================================
-- TEIL 5: ROW LEVEL SECURITY (RLS)
-- ============================================================
-- HINWEIS: RLS ist fuer die Produktiv-DB zunaechst DEAKTIVIERT,
-- damit die App problemlos funktioniert. Die Zugriffskontrolle
-- erfolgt ueber die Anwendungslogik (Rollen-System).
-- RLS kann spaeter schrittweise aktiviert werden.

-- Alle Tabellen: RLS deaktiviert lassen (Supabase Default)
-- Falls RLS aktiviert werden soll, hier Policies einfuegen.


-- ============================================================
-- TEIL 6: TRIGGER
-- ============================================================

-- Auto-Update von updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger fuer alle Tabellen mit updated_at
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY[
      'v7_consultant_companies', 'v7_client_companies', 'v7_user_profiles',
      'v7_employees', 'v7_projects', 'v7_project_budget',
      'v7_work_packages', 'v7_project_assignments', 'v7_work_package_assignments',
      'v7_project_team', 'v7_timesheets', 'v7_fzul_timesheets',
      'v7_data_completion'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trigger_updated_at ON %I; 
       CREATE TRIGGER trigger_updated_at BEFORE UPDATE ON %I 
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      t, t
    );
  END LOOP;
END $$;


-- ============================================================
-- TEIL 7: AUTO-ERSTELLUNG USER-PROFIL BEI REGISTRIERUNG
-- ============================================================

-- Trigger-Funktion: Erstellt automatisch ein User-Profil
-- wenn ein neuer User in Supabase Auth angelegt wird
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.v7_user_profiles (id, email, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    'client_user',
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger auf auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- FERTIG!
-- ============================================================
-- Naechste Schritte:
-- 1. Pruefen ob alle Tabellen existieren (siehe Pruef-Query unten)
-- 2. Auth-User anlegen (Martin, Robin Freund)
-- 3. Stammdaten einfuegen (Cubintec, Steuerkanzlei Freund)
-- 4. Vercel Env-Vars umstellen
--
-- Pruef-Query:
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public' AND tablename LIKE 'v7_%'
-- ORDER BY tablename;
-- ============================================================
