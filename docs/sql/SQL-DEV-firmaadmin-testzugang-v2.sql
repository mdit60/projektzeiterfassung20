-- ============================================================================
-- PZE DEV -- Firmen-Admin-Testzugang (NUR Entwicklungsumgebung!)
-- Datei: SQL-DEV-firmaadmin-testzugang-v2.sql
-- ----------------------------------------------------------------------------
-- v2: Nutzt BEREITS VORHANDENE Auth-User. Kein Anlegen neuer User, kein
--     UUID-Kopieren mehr -- der User wird automatisch ueber die E-Mail in
--     auth.users gefunden. Du traegst unten nur die zwei E-Mail-Adressen ein.
--
-- Was das Skript macht (je Zugang):
--   1. sucht den Auth-User anhand der E-Mail (auth.users)
--   2. sucht die Firma anhand des Namens (v7_client_companies)
--   3. setzt v7_user_profiles.role = 'client_user' + client_company_id
--      -> dadurch landet der Login automatisch im gruenen Firmen-Portal
--   4. setzt in v7_employees portal_role = 'client_admin' (= Admin-Recht)
--
-- WICHTIG: NUR in DEV (projektzeiterfassung20) ausfuehren -- NICHT in PROD.
-- HINWEIS: Zum Anmelden brauchst du das PASSWORT des jeweiligen Accounts.
--          Kennst du es nicht, kannst du in Supabase Studio bei dem User ueber
--          das "..."-Menue ein neues setzen (bzw. den User neu anlegen).
-- ============================================================================

DO $$
DECLARE
  -- >>> HIER die zwei E-Mail-Adressen der vorhandenen Accounts eintragen <<<
  v_email_assystem text := 't.duehrkop@assystem.de';          -- AS System
  v_email_luebeck  text := 't.schulze-hagennest@luebeckyacht.de'; -- Luebeck Yacht

  v_uid_assystem   uuid;
  v_uid_luebeck    uuid;
  v_firma_assystem uuid;
  v_firma_luebeck  uuid;
BEGIN
  -- Auth-User anhand E-Mail finden (case-insensitiv)
  SELECT id INTO v_uid_assystem FROM auth.users
    WHERE lower(email) = lower(v_email_assystem) LIMIT 1;
  SELECT id INTO v_uid_luebeck  FROM auth.users
    WHERE lower(email) = lower(v_email_luebeck) LIMIT 1;

  IF v_uid_assystem IS NULL THEN
    RAISE EXCEPTION 'Kein Auth-User mit E-Mail % gefunden.', v_email_assystem;
  END IF;
  IF v_uid_luebeck IS NULL THEN
    RAISE EXCEPTION 'Kein Auth-User mit E-Mail % gefunden.', v_email_luebeck;
  END IF;

  -- Firmen anhand Name finden (ILIKE + markanter Teil, umgeht Umlaut-Frage)
  SELECT id INTO v_firma_assystem FROM v7_client_companies
    WHERE name ILIKE 'AS System%' ORDER BY created_at NULLS LAST LIMIT 1;
  SELECT id INTO v_firma_luebeck  FROM v7_client_companies
    WHERE name ILIKE '%beck Yacht Trave Schiff%' ORDER BY created_at NULLS LAST LIMIT 1;

  IF v_firma_assystem IS NULL THEN
    RAISE EXCEPTION 'Firma "AS System" nicht gefunden.';
  END IF;
  IF v_firma_luebeck IS NULL THEN
    RAISE EXCEPTION 'Firma "Luebeck Yacht Trave Schiff GmbH" nicht gefunden.';
  END IF;

  -- ==========================================================================
  -- AS System
  -- ==========================================================================
  INSERT INTO v7_user_profiles
    (id, email, display_name, role, client_company_id, is_active)
  VALUES
    (v_uid_assystem, v_email_assystem, 'Firmen-Admin AS System',
     'client_user', v_firma_assystem, true)
  ON CONFLICT (id) DO UPDATE
    SET role              = 'client_user',
        client_company_id = EXCLUDED.client_company_id,
        is_active         = true;

  -- Firmen-Admin-Recht: vorhandenen Mitarbeiter nutzen, sonst neu anlegen
  IF EXISTS (SELECT 1 FROM v7_employees WHERE user_id = v_uid_assystem) THEN
    UPDATE v7_employees
      SET portal_role = 'client_admin', client_company_id = v_firma_assystem, is_active = true
      WHERE user_id = v_uid_assystem;
  ELSIF EXISTS (SELECT 1 FROM v7_employees
                WHERE lower(email) = lower(v_email_assystem) AND user_id IS NULL) THEN
    UPDATE v7_employees
      SET user_id = v_uid_assystem, portal_role = 'client_admin',
          client_company_id = v_firma_assystem, is_active = true
      WHERE lower(email) = lower(v_email_assystem) AND user_id IS NULL;
  ELSE
    INSERT INTO v7_employees
      (client_company_id, user_id, display_name, first_name, last_name, email,
       portal_role, weekly_hours, company_weekly_hours, annual_bonus, is_active)
    VALUES
      (v_firma_assystem, v_uid_assystem, 'Firmen-Admin (Test)', 'Firmen', 'Admin',
       v_email_assystem, 'client_admin', 40, 40, 0, true);
  END IF;

  -- ==========================================================================
  -- Luebeck Yacht Trave Schiff GmbH
  -- ==========================================================================
  INSERT INTO v7_user_profiles
    (id, email, display_name, role, client_company_id, is_active)
  VALUES
    (v_uid_luebeck, v_email_luebeck, 'Firmen-Admin Luebeck Yacht',
     'client_user', v_firma_luebeck, true)
  ON CONFLICT (id) DO UPDATE
    SET role              = 'client_user',
        client_company_id = EXCLUDED.client_company_id,
        is_active         = true;

  IF EXISTS (SELECT 1 FROM v7_employees WHERE user_id = v_uid_luebeck) THEN
    UPDATE v7_employees
      SET portal_role = 'client_admin', client_company_id = v_firma_luebeck, is_active = true
      WHERE user_id = v_uid_luebeck;
  ELSIF EXISTS (SELECT 1 FROM v7_employees
                WHERE lower(email) = lower(v_email_luebeck) AND user_id IS NULL) THEN
    UPDATE v7_employees
      SET user_id = v_uid_luebeck, portal_role = 'client_admin',
          client_company_id = v_firma_luebeck, is_active = true
      WHERE lower(email) = lower(v_email_luebeck) AND user_id IS NULL;
  ELSE
    INSERT INTO v7_employees
      (client_company_id, user_id, display_name, first_name, last_name, email,
       portal_role, weekly_hours, company_weekly_hours, annual_bonus, is_active)
    VALUES
      (v_firma_luebeck, v_uid_luebeck, 'Firmen-Admin (Test)', 'Firmen', 'Admin',
       v_email_luebeck, 'client_admin', 40, 40, 0, true);
  END IF;

  RAISE NOTICE 'OK: AS System=% (User %), Luebeck=% (User %)',
    v_firma_assystem, v_uid_assystem, v_firma_luebeck, v_uid_luebeck;
END $$;

-- ============================================================================
-- KONTROLLE -- muss 2 Zeilen mit firmen_rolle = client_admin liefern
-- ============================================================================
SELECT p.email,
       p.role         AS profil_rolle,
       c.name         AS firma,
       e.portal_role  AS firmen_rolle,
       e.display_name AS mitarbeiter
FROM v7_user_profiles p
JOIN v7_client_companies c ON c.id = p.client_company_id
LEFT JOIN v7_employees e   ON e.user_id = p.id
WHERE lower(p.email) IN (lower('t.duehrkop@assystem.de'),
                         lower('t.schulze-hagennest@luebeckyacht.de'))
ORDER BY c.name;

-- ============================================================================
-- ENDE SQL-DEV-firmaadmin-testzugang-v2.sql
-- ============================================================================
