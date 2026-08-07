-- ============================================================================
-- PZE DEV -- Firmen-Admin-Testzugang anlegen (NUR Entwicklungsumgebung!)
-- Datei: SQL-DEV-firmaadmin-testzugang-v1.sql
-- ----------------------------------------------------------------------------
-- Zweck: Login-Zugaenge mit Firmen-Administrator-Rechten (portal_role
--        'client_admin') fuer die Firmen "AS System" und "Luebeck Yacht Trave
--        Schiff GmbH", damit das gruene Firmen-Portal getestet werden kann.
--
-- Auth-Modell (zur Einordnung):
--   auth.users            -> der eigentliche Login (E-Mail + Passwort)
--   v7_user_profiles      -> role IMMER 'client_user' (steuert: -> /v7/firma)
--   v7_employees          -> portal_role 'client_admin' (= Firmen-Admin-Recht)
--   Alle drei ueber die gemeinsame user_id verknuepft.
--
-- WICHTIG: NUR in DEV (projektzeiterfassung20) ausfuehren -- NICHT in PROD.
-- ============================================================================

-- ############################################################################
-- SCHRITT 1 (MANUELL, VOR diesem SQL) -- die zwei Auth-User anlegen
-- ############################################################################
--   Supabase Studio -> Authentication -> Users -> Button "Add user":
--     a) E-Mail:  admin.assystem@dev.local   Passwort: <dein Testpasswort>
--        Haken setzen: [x] Auto Confirm User
--     b) E-Mail:  admin.luebeck@dev.local     Passwort: <dein Testpasswort>
--        Haken setzen: [x] Auto Confirm User
--   Danach je User die angezeigte UUID kopieren und unten bei
--   v_uid_assystem / v_uid_luebeck eintragen.
-- ############################################################################

DO $$
DECLARE
  -- >>> HIER die beiden Auth-User-UUIDs aus SCHRITT 1 eintragen <<<
  -- (die '0000...'-Werte sind nur Platzhalter und muessen ersetzt werden)
  v_uid_assystem uuid := '00000000-0000-0000-0000-000000000000';
  v_uid_luebeck  uuid := '00000000-0000-0000-0000-000000000000';

  v_email_assystem text := 'admin.assystem@dev.local';
  v_email_luebeck  text := 'admin.luebeck@dev.local';

  v_firma_assystem uuid;
  v_firma_luebeck  uuid;
BEGIN
  -- Firmen-IDs ermitteln (ILIKE + markanter Namensteil, umgeht Umlaut-Frage)
  SELECT id INTO v_firma_assystem
    FROM v7_client_companies
    WHERE name ILIKE 'AS System%'
    ORDER BY created_at NULLS LAST
    LIMIT 1;

  SELECT id INTO v_firma_luebeck
    FROM v7_client_companies
    WHERE name ILIKE '%beck Yacht Trave Schiff%'
    ORDER BY created_at NULLS LAST
    LIMIT 1;

  IF v_uid_assystem = '00000000-0000-0000-0000-000000000000'::uuid
     OR v_uid_luebeck = '00000000-0000-0000-0000-000000000000'::uuid THEN
    RAISE EXCEPTION 'Bitte zuerst die beiden Auth-User-UUIDs aus SCHRITT 1 eintragen (Platzhalter 0000... ist noch drin).';
  END IF;
  IF v_uid_assystem = v_uid_luebeck THEN
    RAISE EXCEPTION 'Beide UUIDs sind identisch -- bitte je Firma den eigenen Auth-User eintragen.';
  END IF;
  IF v_firma_assystem IS NULL THEN
    RAISE EXCEPTION 'Firma "AS System" nicht gefunden -- Name in v7_client_companies pruefen.';
  END IF;
  IF v_firma_luebeck IS NULL THEN
    RAISE EXCEPTION 'Firma "Luebeck Yacht Trave Schiff GmbH" nicht gefunden -- Name pruefen.';
  END IF;

  -- ==========================================================================
  -- AS System
  -- ==========================================================================
  -- Profil: role IMMER client_user (Admin-Recht kommt aus v7_employees)
  INSERT INTO v7_user_profiles
    (id, email, display_name, role, client_company_id, is_active)
  VALUES
    (v_uid_assystem, v_email_assystem, 'Firmen-Admin AS System',
     'client_user', v_firma_assystem, true)
  ON CONFLICT (id) DO UPDATE
    SET email             = EXCLUDED.email,
        display_name      = EXCLUDED.display_name,
        role              = 'client_user',
        client_company_id = EXCLUDED.client_company_id,
        is_active         = true;

  -- Firmen-Admin-Mitarbeiter (dedizierter Testeintrag, verknuepft mit Auth-User)
  IF EXISTS (SELECT 1 FROM v7_employees WHERE user_id = v_uid_assystem) THEN
    UPDATE v7_employees
      SET portal_role       = 'client_admin',
          client_company_id = v_firma_assystem,
          is_active         = true
      WHERE user_id = v_uid_assystem;
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
    SET email             = EXCLUDED.email,
        display_name      = EXCLUDED.display_name,
        role              = 'client_user',
        client_company_id = EXCLUDED.client_company_id,
        is_active         = true;

  IF EXISTS (SELECT 1 FROM v7_employees WHERE user_id = v_uid_luebeck) THEN
    UPDATE v7_employees
      SET portal_role       = 'client_admin',
          client_company_id = v_firma_luebeck,
          is_active         = true
      WHERE user_id = v_uid_luebeck;
  ELSE
    INSERT INTO v7_employees
      (client_company_id, user_id, display_name, first_name, last_name, email,
       portal_role, weekly_hours, company_weekly_hours, annual_bonus, is_active)
    VALUES
      (v_firma_luebeck, v_uid_luebeck, 'Firmen-Admin (Test)', 'Firmen', 'Admin',
       v_email_luebeck, 'client_admin', 40, 40, 0, true);
  END IF;

  RAISE NOTICE 'OK: Firmen-Admin-Zugaenge angelegt. AS System=%, Luebeck=%',
    v_firma_assystem, v_firma_luebeck;
END $$;

-- ============================================================================
-- KONTROLLE -- sollte 2 Zeilen mit portal_role = client_admin liefern
-- ============================================================================
SELECT p.email,
       p.role                AS profil_rolle,
       c.name                AS firma,
       e.portal_role         AS firmen_rolle,
       e.display_name        AS mitarbeiter
FROM v7_user_profiles p
JOIN v7_client_companies c ON c.id = p.client_company_id
LEFT JOIN v7_employees e   ON e.user_id = p.id
WHERE p.email IN ('admin.assystem@dev.local', 'admin.luebeck@dev.local')
ORDER BY c.name;

-- ============================================================================
-- ENDE SQL-DEV-firmaadmin-testzugang-v1.sql
-- ============================================================================
