-- ============================================================================
-- PZE DEV -- Firmen-Admin-Testzugaenge (NUR Entwicklungsumgebung!)
-- Datei: SQL-DEV-firmaadmin-testzugang-v3.sql
-- ----------------------------------------------------------------------------
-- v3: Beliebig viele Zugaenge in einer Liste. Firma wird NICHT mehr ueber den
--     Namen gesucht, sondern automatisch aus dem vorhandenen Mitarbeiter-
--     Eintrag (v7_employees) der jeweiligen E-Mail abgeleitet. Robust fuer
--     alle Firmen (auch Tippl usw.).
--
-- Ablauf je E-Mail:
--   1. Auth-User in auth.users finden (per E-Mail)
--   2. Mitarbeiter in v7_employees finden (per user_id, sonst per E-Mail)
--      -> dessen client_company_id ist die Firma
--   3. v7_user_profiles.role = 'client_user' + client_company_id setzen
--      (-> Login landet automatisch im gruenen Firmen-Portal)
--   4. Mitarbeiter: portal_role = 'client_admin' + user_id verknuepfen
--   Fehlt User oder Mitarbeiter, wird die Zeile mit Hinweis uebersprungen.
--
-- WICHTIG: NUR in DEV (projektzeiterfassung20) ausfuehren -- NICHT in PROD.
-- HINWEIS: Zum Anmelden brauchst du das PASSWORT des jeweiligen Accounts.
-- ============================================================================

DO $$
DECLARE
  -- >>> Liste der E-Mails der vorhandenen Accounts (beliebig erweiterbar) <<<
  v_emails text[] := ARRAY[
    't.duehrkop@assystem.de',
    't.schulze-hagennest@luebeckyacht.de',
    'manfred.herrler@automotive-synergies.com',
    'ferat.sarac@selaflex.com',
    'k.naber@alacsystems.com',
    'mario.tippl@tippl.de',
    'reinhard.matzke@stoma-gmbh.de',
    'robin.freund@steuerkanzlei-freund.de'
  ];

  v_email    text;
  v_uid      uuid;
  v_emp_id   uuid;
  v_firma    uuid;
  v_name     text;
  v_ok       int := 0;
  v_skip     int := 0;
BEGIN
  FOREACH v_email IN ARRAY v_emails LOOP

    -- 1. Auth-User
    SELECT id INTO v_uid FROM auth.users
      WHERE lower(email) = lower(v_email) LIMIT 1;
    IF v_uid IS NULL THEN
      RAISE NOTICE 'UEBERSPRUNGEN (kein Auth-User): %', v_email;
      v_skip := v_skip + 1;
      CONTINUE;
    END IF;

    -- 2. Mitarbeiter finden: erst per user_id, sonst per E-Mail
    v_emp_id := NULL; v_firma := NULL; v_name := NULL;
    SELECT id, client_company_id, display_name
      INTO v_emp_id, v_firma, v_name
      FROM v7_employees WHERE user_id = v_uid LIMIT 1;
    IF v_emp_id IS NULL THEN
      SELECT id, client_company_id, display_name
        INTO v_emp_id, v_firma, v_name
        FROM v7_employees WHERE lower(email) = lower(v_email) LIMIT 1;
    END IF;

    IF v_emp_id IS NULL OR v_firma IS NULL THEN
      RAISE NOTICE 'UEBERSPRUNGEN (kein Mitarbeiter/Firma): %', v_email;
      v_skip := v_skip + 1;
      CONTINUE;
    END IF;

    -- 3. Profil (role IMMER client_user; Admin-Recht kommt aus v7_employees)
    INSERT INTO v7_user_profiles
      (id, email, display_name, role, client_company_id, is_active)
    VALUES
      (v_uid, v_email, COALESCE(v_name, v_email), 'client_user', v_firma, true)
    ON CONFLICT (id) DO UPDATE
      SET role              = 'client_user',
          client_company_id = EXCLUDED.client_company_id,
          is_active         = true;

    -- 4. Mitarbeiter -> Firmen-Admin + Verknuepfung
    UPDATE v7_employees
      SET user_id     = v_uid,
          portal_role = 'client_admin',
          is_active   = true
      WHERE id = v_emp_id;

    RAISE NOTICE 'OK: %  (Firma %, Mitarbeiter %)', v_email, v_firma, v_name;
    v_ok := v_ok + 1;

  END LOOP;

  RAISE NOTICE '---- Fertig: % angelegt/aktualisiert, % uebersprungen ----', v_ok, v_skip;
END $$;

-- ============================================================================
-- KONTROLLE -- je Zugang eine Zeile mit firmen_rolle = client_admin
-- ============================================================================
SELECT p.email,
       p.role         AS profil_rolle,
       c.name         AS firma,
       e.portal_role  AS firmen_rolle,
       e.display_name AS mitarbeiter
FROM v7_user_profiles p
JOIN v7_client_companies c ON c.id = p.client_company_id
LEFT JOIN v7_employees e   ON e.user_id = p.id
WHERE lower(p.email) IN (
  't.duehrkop@assystem.de',
  't.schulze-hagennest@luebeckyacht.de',
  'manfred.herrler@automotive-synergies.com',
  'ferat.sarac@selaflex.com',
  'k.naber@alacsystems.com',
  'mario.tippl@tippl.de',
  'reinhard.matzke@stoma-gmbh.de',
  'robin.freund@steuerkanzlei-freund.de'
)
ORDER BY c.name;

-- ============================================================================
-- ENDE SQL-DEV-firmaadmin-testzugang-v3.sql
-- ============================================================================
