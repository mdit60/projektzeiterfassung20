-- ============================================
-- SUPABASE RPC FUNKTION: get_auth_user_id_by_email
-- ============================================
-- Diese Funktion ermöglicht es, die User-ID eines
-- bereits registrierten Auth-Users anhand der E-Mail
-- zu finden, auch wenn noch kein v7_user_profiles
-- Eintrag existiert.
--
-- INSTALLATION:
-- 1. Gehe zu Supabase Dashboard → SQL Editor
-- 2. Füge dieses SQL ein und führe es aus
-- ============================================

-- Funktion erstellen
CREATE OR REPLACE FUNCTION get_auth_user_id_by_email(user_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  found_user_id UUID;
BEGIN
  -- Suche in auth.users nach der E-Mail
  SELECT id INTO found_user_id
  FROM auth.users
  WHERE email = LOWER(user_email)
  LIMIT 1;
  
  RETURN found_user_id;
END;
$$;

-- Berechtigung für authentifizierte User
GRANT EXECUTE ON FUNCTION get_auth_user_id_by_email(TEXT) TO authenticated;

-- Kommentar
COMMENT ON FUNCTION get_auth_user_id_by_email IS 'Findet die Auth User ID anhand der E-Mail-Adresse. Wird verwendet um bereits registrierte User mit Mitarbeitern zu verknüpfen.';
