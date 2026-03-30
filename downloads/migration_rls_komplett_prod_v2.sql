-- ============================================================================
-- MIGRATION: RLS komplett fuer PROD (PZE-production)
-- Datum: 31. Maerz 2026
-- Ausfuehren in: PZE-production (SQL Editor)
--
-- Schritt 1: Hilfsfunktionen erstellen (fehlten in PROD komplett)
-- Schritt 2: RLS aktivieren fuer alle v7-Kerntabellen
-- Schritt 3: Policies erstellen wo noch keine vorhanden
-- Schritt 4: Kontrolle
--
-- WICHTIG: Erst in DEV testen! Diese Migration ist fuer PROD.
-- ============================================================================

-- ============================================================================
-- SCHRITT 1: HILFSFUNKTIONEN ERSTELLEN
-- Diese Funktionen werden von den RLS-Policies benoetigt
-- ============================================================================

-- v7_get_user_role: Gibt die Rolle des aktuellen Users zurueck
CREATE OR REPLACE FUNCTION public.v7_get_user_role()
RETURNS v7_user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role v7_user_role;
BEGIN
    SELECT role INTO user_role
    FROM v7_user_profiles
    WHERE id = auth.uid();

    RETURN COALESCE(user_role, 'client_user'::v7_user_role);
END;
$$;

-- v7_is_system_admin: Prueft ob aktueller User System-Admin ist
CREATE OR REPLACE FUNCTION public.v7_is_system_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN v7_get_user_role() = 'system_admin';
END;
$$;

-- v7_is_consultant: Prueft ob aktueller User Berater oder Admin ist
CREATE OR REPLACE FUNCTION public.v7_is_consultant()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN v7_get_user_role() IN ('system_admin', 'consultant');
END;
$$;

-- v7_can_access_client: Prueft ob aktueller User Zugriff auf eine Firma hat
CREATE OR REPLACE FUNCTION public.v7_can_access_client(p_client_company_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role v7_user_role;
    user_client_id UUID;
BEGIN
    SELECT role, client_company_id
    INTO user_role, user_client_id
    FROM v7_user_profiles
    WHERE id = auth.uid();

    IF user_role = 'system_admin' THEN
        RETURN true;
    END IF;

    IF user_role = 'consultant' THEN
        RETURN true;
    END IF;

    IF user_role = 'client_user' THEN
        RETURN user_client_id = p_client_company_id;
    END IF;

    RETURN false;
END;
$$;

-- ============================================================================
-- SCHRITT 2: RLS AKTIVIEREN
-- Nur fuer Tabellen die noch kein RLS haben
-- ============================================================================

-- Kerntabellen
ALTER TABLE public.v7_user_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v7_client_companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v7_consultant_companies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v7_employees              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v7_projects               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v7_work_packages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v7_work_package_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v7_project_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v7_timesheets             ENABLE ROW LEVEL SECURITY;

-- Zusatztabellen
ALTER TABLE public.v7_project_budget         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v7_project_team           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v7_zahlungsanforderungen  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v7_netzwerk_partner       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v7_netzwerk_eigenanteile  ENABLE ROW LEVEL SECURITY;
-- v7_timesheet_completions existiert nur in PROD (dort manuell angelegt)
-- ALTER TABLE public.v7_timesheet_completions  ENABLE ROW LEVEL SECURITY;

-- Bereits aktiv in PROD (nochmal ausfuehren schadet nicht):
ALTER TABLE public.v7_archive                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v7_consultant_access      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v7_data_completion        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v7_fzul_timesheets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v7_payment_requests       ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SCHRITT 3: POLICIES ERSTELLEN
-- Nur fuer Tabellen ohne bestehende Policies
-- ============================================================================

-- ---- v7_user_profiles ----
DROP POLICY IF EXISTS "Users can read own profile" ON public.v7_user_profiles;
DROP POLICY IF EXISTS v7_user_profiles_select ON public.v7_user_profiles;
DROP POLICY IF EXISTS v7_user_profiles_insert ON public.v7_user_profiles;
DROP POLICY IF EXISTS v7_user_profiles_update ON public.v7_user_profiles;
DROP POLICY IF EXISTS v7_user_profiles_delete ON public.v7_user_profiles;

CREATE POLICY v7_user_profiles_select ON public.v7_user_profiles
    FOR SELECT USING (
        (id = auth.uid())
        OR v7_is_system_admin()
        OR (v7_is_consultant() AND consultant_company_id = (
            SELECT up.consultant_company_id FROM v7_user_profiles up WHERE up.id = auth.uid()
        ))
    );
CREATE POLICY v7_user_profiles_insert ON public.v7_user_profiles
    FOR INSERT WITH CHECK (true);
CREATE POLICY v7_user_profiles_update ON public.v7_user_profiles
    FOR UPDATE USING ((id = auth.uid()) OR v7_is_system_admin());
CREATE POLICY v7_user_profiles_delete ON public.v7_user_profiles
    FOR DELETE USING (v7_is_system_admin());

-- ---- v7_client_companies ----
DROP POLICY IF EXISTS v7_client_companies_policy ON public.v7_client_companies;
CREATE POLICY v7_client_companies_policy ON public.v7_client_companies
    FOR ALL USING (v7_can_access_client(id));

-- ---- v7_consultant_companies ----
DROP POLICY IF EXISTS v7_consultant_companies_policy ON public.v7_consultant_companies;
CREATE POLICY v7_consultant_companies_policy ON public.v7_consultant_companies
    FOR ALL USING (
        v7_is_system_admin()
        OR id = (
            SELECT consultant_company_id FROM v7_user_profiles WHERE id = auth.uid()
        )
    );

-- ---- v7_employees ----
DROP POLICY IF EXISTS v7_employees_policy ON public.v7_employees;
CREATE POLICY v7_employees_policy ON public.v7_employees
    FOR ALL USING (v7_can_access_client(client_company_id));

-- ---- v7_projects ----
DROP POLICY IF EXISTS v7_projects_policy ON public.v7_projects;
CREATE POLICY v7_projects_policy ON public.v7_projects
    FOR ALL USING (v7_can_access_client(client_company_id));

-- ---- v7_work_packages ----
DROP POLICY IF EXISTS v7_work_packages_policy ON public.v7_work_packages;
CREATE POLICY v7_work_packages_policy ON public.v7_work_packages
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM v7_projects p
            WHERE v7_can_access_client(p.client_company_id)
        )
    );

-- ---- v7_work_package_assignments ----
DROP POLICY IF EXISTS v7_work_package_assignments_policy ON public.v7_work_package_assignments;
CREATE POLICY v7_work_package_assignments_policy ON public.v7_work_package_assignments
    FOR ALL USING (
        work_package_id IN (
            SELECT wp.id FROM v7_work_packages wp
            JOIN v7_projects p ON p.id = wp.project_id
            WHERE v7_can_access_client(p.client_company_id)
        )
    );

-- ---- v7_project_assignments ----
DROP POLICY IF EXISTS v7_project_assignments_policy ON public.v7_project_assignments;
CREATE POLICY v7_project_assignments_policy ON public.v7_project_assignments
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM v7_projects p
            WHERE v7_can_access_client(p.client_company_id)
        )
    );

-- ---- v7_timesheets ----
DROP POLICY IF EXISTS v7_timesheets_select ON public.v7_timesheets;
DROP POLICY IF EXISTS v7_timesheets_insert ON public.v7_timesheets;
DROP POLICY IF EXISTS v7_timesheets_update ON public.v7_timesheets;
DROP POLICY IF EXISTS v7_timesheets_delete ON public.v7_timesheets;

CREATE POLICY v7_timesheets_select ON public.v7_timesheets
    FOR SELECT USING (
        (employee_id IN (
            SELECT e.id FROM v7_employees e
            WHERE v7_can_access_client(e.client_company_id)
        ))
        OR
        (employee_id IN (
            SELECT e.id FROM v7_employees e WHERE e.user_id = auth.uid()
        ))
    );
CREATE POLICY v7_timesheets_insert ON public.v7_timesheets
    FOR INSERT WITH CHECK (true);
CREATE POLICY v7_timesheets_update ON public.v7_timesheets
    FOR UPDATE USING (
        v7_is_consultant()
        OR (
            v7_get_user_role() = 'client_user'
            AND employee_id IN (
                SELECT e.id FROM v7_employees e
                WHERE e.client_company_id = (
                    SELECT up.client_company_id FROM v7_user_profiles up WHERE up.id = auth.uid()
                )
            )
        )
        OR employee_id IN (
            SELECT e.id FROM v7_employees e WHERE e.user_id = auth.uid()
        )
    );
CREATE POLICY v7_timesheets_delete ON public.v7_timesheets
    FOR DELETE USING (
        v7_is_consultant()
        OR v7_get_user_role() = 'client_user'
    );

-- -- ---- v7_timesheet_completions ----
-- DROP POLICY IF EXISTS v7_timesheet_completions_policy ON public.v7_timesheet_completions;
-- CREATE POLICY v7_timesheet_completions_policy ON public.v7_timesheet_completions
--     FOR ALL USING (
--         project_id IN (
--             SELECT p.id FROM v7_projects p
--             WHERE v7_can_access_client(p.client_company_id)
--         )
--     );

-- ---- v7_project_budget ----
DROP POLICY IF EXISTS v7_project_budget_policy ON public.v7_project_budget;
CREATE POLICY v7_project_budget_policy ON public.v7_project_budget
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM v7_projects p
            WHERE v7_can_access_client(p.client_company_id)
        )
    );

-- ---- v7_project_team ----
DROP POLICY IF EXISTS v7_project_team_policy ON public.v7_project_team;
CREATE POLICY v7_project_team_policy ON public.v7_project_team
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM v7_projects p
            WHERE v7_can_access_client(p.client_company_id)
        )
    );

-- ---- v7_zahlungsanforderungen ----
DROP POLICY IF EXISTS v7_zahlungsanforderungen_policy ON public.v7_zahlungsanforderungen;
CREATE POLICY v7_zahlungsanforderungen_policy ON public.v7_zahlungsanforderungen
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM v7_projects p
            WHERE v7_can_access_client(p.client_company_id)
        )
    );

-- ---- v7_netzwerk_partner ----
DROP POLICY IF EXISTS v7_netzwerk_partner_policy ON public.v7_netzwerk_partner;
CREATE POLICY v7_netzwerk_partner_policy ON public.v7_netzwerk_partner
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM v7_projects p
            WHERE v7_can_access_client(p.client_company_id)
        )
    );

-- ---- v7_netzwerk_eigenanteile ----
DROP POLICY IF EXISTS v7_netzwerk_eigenanteile_policy ON public.v7_netzwerk_eigenanteile;
CREATE POLICY v7_netzwerk_eigenanteile_policy ON public.v7_netzwerk_eigenanteile
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM v7_projects p
            WHERE v7_can_access_client(p.client_company_id)
        )
    );

-- ============================================================================
-- SCHRITT 4: KONTROLLE
-- ============================================================================

SELECT
    t.tablename,
    t.rowsecurity AS rls_aktiv,
    COUNT(p.policyname) AS anzahl_policies
FROM pg_tables t
LEFT JOIN pg_policies p
    ON p.schemaname = t.schemaname
    AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
    AND t.tablename LIKE 'v7_%'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
