-- ============================================================
-- PZE V7 - Migration: Funktion v7_beraterfirma_namen()
-- Version: v1
-- Datum: 15. Juli 2026 (Session 68)
-- Auszufuehren in: DEV UND PROD
-- ============================================================
--
-- ANLASS
-- In der FZul-Vorhabenliste soll der Ersteller mit Namen erscheinen, damit
-- sofort erkennbar ist, wer Eigentuemer ist und wer loeschen kann (bei groesseren
-- Beratungen mit vielen Mitarbeitern der eigentliche Nutzen).
-- Die Liste kennt aber nur created_by (UUID), nicht den Namen.
--
-- PROBLEM
-- Die SELECT-Policy auf v7_user_profiles lautet (id = auth.uid()) - ein Berater
-- darf ausschliesslich SEIN EIGENES Profil lesen. Ein Kollegen-Name ist damit
-- nicht abrufbar.
-- Die Policy laesst sich NICHT einfach erweitern: Eine Policy auf
-- v7_user_profiles, die selbst v7_user_profiles liest (um die eigene
-- consultant_company_id zu ermitteln), erzeugt eine ENDLOSREKURSION.
--
-- LOESUNG (Variante B - minimale Datenpreisgabe)
-- Eine SECURITY DEFINER-Funktion liest intern an der RLS vorbei (keine Rekursion)
-- und gibt NUR id + Anzeigename der Kollegen der EIGENEN Beraterfirma zurueck -
-- keine E-Mail, kein Benutzername, keine Rolle. Gleiches Muster wie das bereits
-- vorhandene v7_is_system_admin().
-- Die SELECT-Policy auf v7_user_profiles bleibt UNVERAENDERT eng.
-- ============================================================

create or replace function v7_beraterfirma_namen()
returns table (user_id uuid, anzeige_name text)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id,
    coalesce(
      nullif(btrim(p.display_name), ''),
      nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
      p.email
    ) as anzeige_name
  from v7_user_profiles p
  where p.consultant_company_id is not null
    and p.consultant_company_id = (
      select consultant_company_id
      from v7_user_profiles
      where id = auth.uid()
    );
$$;

comment on function v7_beraterfirma_namen() is
  'Gibt id + Anzeigename aller Nutzer der EIGENEN Beraterfirma zurueck (SECURITY DEFINER, umgeht die enge SELECT-Policy auf v7_user_profiles ohne Rekursion). Bewusst NUR Name - keine E-Mail/Rolle. Verwendet fuer die Ersteller-Anzeige in der FZul-Vorhabenliste.';

-- Rechte: nur angemeldete Nutzer duerfen die Funktion ausfuehren
revoke all on function v7_beraterfirma_namen() from public;
grant execute on function v7_beraterfirma_namen() to authenticated;

-- ------------------------------------------------------------
-- Kontrolle
-- ------------------------------------------------------------
-- Erwartung: Liefert die Nutzer der eigenen Beraterfirma mit Namen.
-- (Im SQL-Editor laeuft die Abfrage ohne auth.uid() - dort ist das Ergebnis
--  leer. Der echte Test erfolgt in der App bzw. mit einem Nutzer-Token.)
select user_id, anzeige_name from v7_beraterfirma_namen();

-- Gegenprobe: die enge SELECT-Policy auf v7_user_profiles ist unveraendert
select policyname, cmd, qual
from pg_policies
where tablename = 'v7_user_profiles' and cmd = 'SELECT';
