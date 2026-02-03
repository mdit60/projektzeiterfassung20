-- ============================================
-- V7 DATENBANK-SCHEMA
-- Projektzeiterfassung - Berater-Portal
-- Stand: 30. Dezember 2024
-- ============================================

-- ============================================
-- 1. BERATER-FIRMEN (Consultant Companies)
-- ============================================

CREATE TABLE v7_consultant_companies (
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_v7_consultant_companies_active ON v7_consultant_companies(is_active);

-- ============================================
-- 2. KUNDEN-FIRMEN (Client Companies)
-- Gehören zu einem Berater
-- ============================================

CREATE TABLE v7_client_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_company_id UUID NOT NULL REFERENCES v7_consultant_companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    short_name TEXT,
    street TEXT,
    zip_code TEXT,
    city TEXT,
    federal_state TEXT,  -- Format: DE-BW, DE-NW, DE-SH, etc.
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    internal_notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT v7_client_companies_unique UNIQUE(consultant_company_id, name)
);

CREATE INDEX idx_v7_client_companies_consultant ON v7_client_companies(consultant_company_id);
CREATE INDEX idx_v7_client_companies_active ON v7_client_companies(is_active);

-- ============================================
-- 3. BENUTZER-PROFILE (User Profiles)
-- Verknüpft Auth-User mit Berater/Kunde
-- ============================================

CREATE TABLE v7_user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'consultant',  -- 'system_admin', 'consultant', 'client_user'
    consultant_company_id UUID REFERENCES v7_consultant_companies(id),
    client_company_id UUID REFERENCES v7_client_companies(id),
    is_active BOOLEAN DEFAULT true,
    invited_by UUID REFERENCES v7_user_profiles(id),
    invited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_v7_user_profiles_email ON v7_user_profiles(email);
CREATE INDEX idx_v7_user_profiles_consultant ON v7_user_profiles(consultant_company_id);
CREATE INDEX idx_v7_user_profiles_client ON v7_user_profiles(client_company_id);

-- ============================================
-- 4. PROJEKTE (Projects)
-- Gehören zu einer Kunden-Firma
-- ============================================

CREATE TABLE v7_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_company_id UUID NOT NULL REFERENCES v7_client_companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    short_name TEXT,
    funding_reference TEXT,  -- FKZ: 16KN087520, 01LY1925A, etc.
    funding_format TEXT,     -- 'ZIM', 'BMBF_KMU', 'FZUL', etc.
    start_date DATE,
    end_date DATE,
    fzul_vorhaben_title TEXT,  -- Kurzbezeichnung lt. FZul-Bescheinigung
    fzul_vorhaben_id TEXT,     -- Vorhaben-ID lt. FZul-Bescheinigung
    source_filename TEXT,      -- Original-Dateiname beim Import
    imported_at TIMESTAMPTZ,   -- Wann importiert
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_v7_projects_company ON v7_projects(client_company_id);
CREATE INDEX idx_v7_projects_fkz ON v7_projects(funding_reference);
CREATE INDEX idx_v7_projects_active ON v7_projects(is_active);

-- ============================================
-- 5. MITARBEITER (Employees)
-- Gehören zu einer Kunden-Firma
-- ============================================

CREATE TABLE v7_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_company_id UUID NOT NULL REFERENCES v7_client_companies(id) ON DELETE CASCADE,
    user_id UUID,  -- Optional: Verknüpfung mit Auth-User
    
    -- Namen
    display_name TEXT NOT NULL,  -- Format: "Nachname, Vorname"
    first_name TEXT,
    last_name TEXT,
    name TEXT,                   -- Format: "Vorname Nachname"
    
    -- Kontakt
    email TEXT,
    
    -- Arbeitsverhältnis
    weekly_hours NUMERIC(4,1) DEFAULT 40.0,
    annual_leave_days INTEGER DEFAULT 30,
    position_title TEXT,
    position TEXT,
    qualification TEXT,
    
    -- Beschäftigungszeitraum
    employment_start DATE,
    employment_end DATE,
    entry_date DATE,
    exit_date DATE,
    
    -- Sonstiges
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT v7_employees_unique UNIQUE(client_company_id, display_name)
);

CREATE INDEX idx_v7_employees_company ON v7_employees(client_company_id);
CREATE INDEX idx_v7_employees_active ON v7_employees(is_active);
CREATE INDEX idx_v7_employees_name ON v7_employees(display_name);

-- ============================================
-- 6. PROJEKT-ZUORDNUNGEN (Project Assignments)
-- Welcher MA arbeitet an welchem Projekt
-- ============================================

CREATE TABLE v7_project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES v7_employees(id) ON DELETE CASCADE,
    role_in_project TEXT,
    fue_percentage NUMERIC(5,2) DEFAULT 100.00,
    assignment_start DATE,
    assignment_end DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT v7_project_assignments_unique UNIQUE(project_id, employee_id)
);

CREATE INDEX idx_v7_assignments_project ON v7_project_assignments(project_id);
CREATE INDEX idx_v7_assignments_employee ON v7_project_assignments(employee_id);

-- ============================================
-- 7. TIMESHEETS (Stundennachweise)
-- Monatliche Erfassung pro MA/Projekt
-- ============================================

CREATE TABLE v7_timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES v7_employees(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    daily_data JSONB,  -- {"1": 8, "2": 8, "3": "U", ...}
    total_hours NUMERIC(6,2),
    total_fue_hours NUMERIC(6,2),
    notes TEXT,
    is_locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMPTZ,
    locked_by UUID REFERENCES v7_user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT v7_timesheets_unique UNIQUE(project_id, employee_id, year, month)
);

CREATE INDEX idx_v7_timesheets_project ON v7_timesheets(project_id);
CREATE INDEX idx_v7_timesheets_employee ON v7_timesheets(employee_id);
CREATE INDEX idx_v7_timesheets_period ON v7_timesheets(year, month);

-- ============================================
-- 8. FZUL TIMESHEETS (FZul-spezifische Daten)
-- Aggregierte Jahres-Übersicht für FZul
-- ============================================

CREATE TABLE v7_fzul_timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES v7_employees(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    federal_state TEXT,  -- Bundesland für Feiertagsberechnung
    
    -- Monatsdaten als JSONB
    monthly_data JSONB,  -- {"1": {"days": {...}, "available": 168, "worked": 160}, ...}
    
    -- Jahressummen
    total_available_hours NUMERIC(6,2),
    total_worked_hours NUMERIC(6,2),
    total_fue_hours NUMERIC(6,2),
    
    -- FZul-spezifisch
    vorhaben_title TEXT,
    vorhaben_id TEXT,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT v7_fzul_timesheets_unique UNIQUE(employee_id, year)
);

CREATE INDEX idx_v7_fzul_timesheets_employee ON v7_fzul_timesheets(employee_id);
CREATE INDEX idx_v7_fzul_timesheets_year ON v7_fzul_timesheets(year);

-- ============================================
-- 9. BERATER-ZUGRIFF (Consultant Access)
-- Für DSGVO-konforme Autorisierung (Phase 2)
-- ============================================

CREATE TABLE v7_consultant_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_company_id UUID NOT NULL REFERENCES v7_consultant_companies(id) ON DELETE CASCADE,
    client_company_id UUID NOT NULL REFERENCES v7_client_companies(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES v7_user_profiles(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES v7_user_profiles(id),
    access_level TEXT DEFAULT 'full',  -- 'full', 'read_only', 'limited'
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT v7_consultant_access_unique UNIQUE(consultant_company_id, client_company_id)
);

-- ============================================
-- 10. DATEN-VOLLSTÄNDIGKEIT (Data Completion)
-- Tracking welche Daten erfasst sind
-- ============================================

CREATE TABLE v7_data_completion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_company_id UUID NOT NULL REFERENCES v7_client_companies(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    employees_count INTEGER DEFAULT 0,
    employees_complete INTEGER DEFAULT 0,
    projects_count INTEGER DEFAULT 0,
    projects_complete INTEGER DEFAULT 0,
    status TEXT DEFAULT 'incomplete',  -- 'incomplete', 'complete', 'locked'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT v7_data_completion_unique UNIQUE(client_company_id, year, month)
);

-- ============================================
-- 11. ARCHIV (Archive)
-- Gespeicherte Exporte
-- ============================================

CREATE TABLE v7_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_company_id UUID NOT NULL REFERENCES v7_client_companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES v7_employees(id) ON DELETE SET NULL,
    project_id UUID REFERENCES v7_projects(id) ON DELETE SET NULL,
    archive_type TEXT NOT NULL,  -- 'fzul_excel', 'fzul_pdf', 'timesheet_pdf'
    year INTEGER,
    month INTEGER,
    filename TEXT NOT NULL,
    file_data TEXT,  -- Base64 encoded
    file_size INTEGER,
    metadata JSONB,
    created_by UUID REFERENCES v7_user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_v7_archive_company ON v7_archive(client_company_id);
CREATE INDEX idx_v7_archive_type ON v7_archive(archive_type);
CREATE INDEX idx_v7_archive_year ON v7_archive(year);

-- ============================================
-- TRIGGER: Auto-Update Timestamp
-- ============================================

CREATE OR REPLACE FUNCTION v7_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für alle Tabellen mit updated_at
CREATE TRIGGER v7_consultant_companies_updated BEFORE UPDATE ON v7_consultant_companies FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();
CREATE TRIGGER v7_client_companies_updated BEFORE UPDATE ON v7_client_companies FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();
CREATE TRIGGER v7_user_profiles_updated BEFORE UPDATE ON v7_user_profiles FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();
CREATE TRIGGER v7_projects_updated BEFORE UPDATE ON v7_projects FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();
CREATE TRIGGER v7_employees_updated BEFORE UPDATE ON v7_employees FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();
CREATE TRIGGER v7_project_assignments_updated BEFORE UPDATE ON v7_project_assignments FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();
CREATE TRIGGER v7_timesheets_updated BEFORE UPDATE ON v7_timesheets FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();
CREATE TRIGGER v7_fzul_timesheets_updated BEFORE UPDATE ON v7_fzul_timesheets FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();
CREATE TRIGGER v7_consultant_access_updated BEFORE UPDATE ON v7_consultant_access FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();
CREATE TRIGGER v7_data_completion_updated BEFORE UPDATE ON v7_data_completion FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();

-- ============================================
-- RLS POLICIES (Entwicklung: deaktiviert)
-- Für Produktion aktivieren!
-- ============================================

-- Entwicklungsmodus: RLS deaktivieren
ALTER TABLE v7_consultant_companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_client_companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_project_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_timesheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_fzul_timesheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_consultant_access DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_data_completion DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_archive DISABLE ROW LEVEL SECURITY;

-- ============================================
-- BEISPIEL RLS POLICIES (für Produktion)
-- ============================================

/*
-- Aktivieren:
ALTER TABLE v7_client_companies ENABLE ROW LEVEL SECURITY;

-- Berater sieht nur seine Kunden:
CREATE POLICY "Berater sieht eigene Kunden" ON v7_client_companies
    FOR ALL USING (
        consultant_company_id IN (
            SELECT consultant_company_id FROM v7_user_profiles 
            WHERE email = auth.jwt()->>'email'
        )
    );

-- Ähnliche Policies für andere Tabellen...
*/

-- ============================================
-- TESTDATEN (Optional)
-- ============================================

/*
-- Berater-Firma anlegen
INSERT INTO v7_consultant_companies (id, name, short_name, city, federal_state)
VALUES ('4f20d4bc-588d-4291-bc0b-995943533829', 'MD Business Services', 'MDBS', 'Kiel', 'DE-SH');

-- Benutzer-Profil anlegen
INSERT INTO v7_user_profiles (email, first_name, last_name, display_name, role, consultant_company_id)
VALUES ('m.ditscherlein@cubintec.com', 'Martin', 'Ditscherlein', 'Martin Ditscherlein', 'system_admin', '4f20d4bc-588d-4291-bc0b-995943533829');
*/

-- ============================================
-- ENDE V7-SCHEMA
-- ============================================
