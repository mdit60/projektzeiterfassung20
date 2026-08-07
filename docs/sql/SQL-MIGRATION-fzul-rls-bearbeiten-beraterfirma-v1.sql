-- ============================================================
-- PZE V7 - Migration: FZul-RLS "Bearbeiten" auf die Beraterfirma ausweiten
-- Version: v1
-- Datum: 15. Juli 2026 (Session 68)
-- Auszufuehren in: DEV UND PROD
-- ============================================================
--
-- ANLASS
-- Die Policies waren asymmetrisch: LESEN beraterfirmen-weit, aber
-- BEARBEITEN ersteller-gebunden (created_by = auth.uid()). Folge: Ein Berater
-- sah Vorhaben anderer Berater, konnte daran aber nichts tun - Import und
-- Kalender-Speichern schlugen wegen RLS LAUTLOS fehl (PostgREST liefert bei
-- 0 betroffenen Zeilen keinen Fehler).
--
-- ZIELBILD (Vorgabe Martin)
--   Berater : alle Vorhaben der eigenen Beraterfirma LESEN + BEARBEITEN,
--             aber nur SELBST ANGELEGTE loeschen
--   SysAdmin: alles lesen, bearbeiten, loeschen
--
-- AENDERUNG
--   Nur die BEARBEITEN-Policies werden auf die Beraterfirmen-Logik gezogen
--   (identisch zur bestehenden SELECT-Policy):
--     - v7_fzul_vorhaben   : UPDATE
--     - v7_fzul_timesheets : INSERT, UPDATE
--
-- BEWUSST UNVERAENDERT
--   - v7_fzul_vorhaben.DELETE   (created_by = auth.uid())  -> nur Ersteller
--   - v7_fzul_timesheets.DELETE (fv.created_by = auth.uid())-> nur Ersteller
--     (wird ausschliesslich beim Loeschen eines Vorhabens verwendet)
--   - v7_fzul_vorhaben.INSERT   (created_by = auth.uid())  -> Ersteller wird
--     beim Anlegen korrekt gestempelt
--   - *_system_admin_all (FOR ALL)                          -> SysAdmin kann alles
-- ============================================================

-- ------------------------------------------------------------
-- 1. v7_fzul_vorhaben: UPDATE auf die Beraterfirma ausweiten
-- ------------------------------------------------------------
drop policy if exists "fzul_vorhaben_berater_update" on v7_fzul_vorhaben;

create policy "fzul_vorhaben_berater_update" on v7_fzul_vorhaben
for update
using (
  exists (
    select 1
    from v7_user_profiles up
    join v7_client_companies cc on cc.consultant_company_id = up.consultant_company_id
    where up.id = auth.uid()
      and up.role = 'consultant'::v7_user_role
      and cc.id = v7_fzul_vorhaben.client_company_id
  )
)
with check (
  exists (
    select 1
    from v7_user_profiles up
    join v7_client_companies cc on cc.consultant_company_id = up.consultant_company_id
    where up.id = auth.uid()
      and up.role = 'consultant'::v7_user_role
      and cc.id = v7_fzul_vorhaben.client_company_id
  )
);

-- ------------------------------------------------------------
-- 2. v7_fzul_timesheets: INSERT auf die Beraterfirma ausweiten
-- ------------------------------------------------------------
drop policy if exists "fzul_timesheets_berater_insert" on v7_fzul_timesheets;

create policy "fzul_timesheets_berater_insert" on v7_fzul_timesheets
for insert
with check (
  exists (
    select 1
    from v7_fzul_vorhaben fv
    join v7_client_companies cc on cc.id = fv.client_company_id
    join v7_user_profiles up on up.consultant_company_id = cc.consultant_company_id
    where fv.id = v7_fzul_timesheets.vorhaben_id
      and up.id = auth.uid()
      and up.role = 'consultant'::v7_user_role
  )
);

-- ------------------------------------------------------------
-- 3. v7_fzul_timesheets: UPDATE auf die Beraterfirma ausweiten
-- ------------------------------------------------------------
drop policy if exists "fzul_timesheets_berater_update" on v7_fzul_timesheets;

create policy "fzul_timesheets_berater_update" on v7_fzul_timesheets
for update
using (
  exists (
    select 1
    from v7_fzul_vorhaben fv
    join v7_client_companies cc on cc.id = fv.client_company_id
    join v7_user_profiles up on up.consultant_company_id = cc.consultant_company_id
    where fv.id = v7_fzul_timesheets.vorhaben_id
      and up.id = auth.uid()
      and up.role = 'consultant'::v7_user_role
  )
)
with check (
  exists (
    select 1
    from v7_fzul_vorhaben fv
    join v7_client_companies cc on cc.id = fv.client_company_id
    join v7_user_profiles up on up.consultant_company_id = cc.consultant_company_id
    where fv.id = v7_fzul_timesheets.vorhaben_id
      and up.id = auth.uid()
      and up.role = 'consultant'::v7_user_role
  )
);

-- ------------------------------------------------------------
-- 4. Kontrolle: Soll-Bild nach der Migration
-- ------------------------------------------------------------
-- Erwartung:
--   v7_fzul_vorhaben   DELETE -> (created_by = auth.uid())          [unveraendert]
--   v7_fzul_vorhaben   UPDATE -> consultant_company_id-Logik        [NEU]
--   v7_fzul_vorhaben   INSERT -> (created_by = auth.uid()) + Rolle  [unveraendert]
--   v7_fzul_vorhaben   SELECT -> consultant_company_id-Logik        [unveraendert]
--   v7_fzul_timesheets DELETE -> fv.created_by = auth.uid()         [unveraendert]
--   v7_fzul_timesheets INSERT -> consultant_company_id-Logik        [NEU]
--   v7_fzul_timesheets UPDATE -> consultant_company_id-Logik        [NEU]
--   *_system_admin_all ALL    -> role = system_admin                [unveraendert]

select tablename, policyname, cmd, qual, with_check
from pg_policies
where tablename in ('v7_fzul_vorhaben', 'v7_fzul_timesheets')
order by tablename, cmd, policyname;
