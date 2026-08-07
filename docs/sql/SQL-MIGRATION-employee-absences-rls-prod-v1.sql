-- =====================================================================
-- SQL-MIGRATION-employee-absences-rls-prod-v1.sql
-- Ziel-DB : PROD  (PZE-production, ref cnnuyioklhlrfygwticf)
-- Zweck   : RLS auf v7_employee_absences aktivieren + 4 Policies 1:1
--           aus DEV spiegeln; sensible Backup-Tabelle absichern.
-- Anlass  : Supabase-Advisor rls_disabled_in_public. Tabelle enthaelt
--           Abwesenheitscode K (Krankheit) = Gesundheitsdaten Art. 9 DSGVO.
-- Basis   : DEV-Policies (Session 58), unveraendert uebernommen.
-- Hinweis : Ausfuehrung durch Martin im PROD-SQL-Editor. NICHT in DEV.
-- =====================================================================


-- =====================================================================
-- SCHRITT 0 (ZUERST, separat ausfuehren) - reiner Lese-Vorabcheck
-- Prueft, ob die von den Policies benoetigten Helfer in PROD existieren.
-- Erwartetes Ergebnis: 4 Zeilen (3 Funktionen + 1 Typ).
-- Fehlt eine Zeile -> STOPP, nicht weitermachen, erst hier melden.
-- =====================================================================
select 'function' as art, proname as name
  from pg_proc
 where proname in ('v7_can_access_client', 'v7_is_consultant', 'v7_get_user_role')
union all
select 'type' as art, typname as name
  from pg_type
 where typname = 'v7_user_role'
 order by art, name;


-- =====================================================================
-- SCHRITT 1 - Haupttabelle absichern (nur ausfuehren, wenn Schritt 0 ok)
-- Transaktional: entweder alles oder nichts. Innerhalb der Transaktion
-- gibt es kein Zeitfenster, in dem RLS an ist, aber Policies fehlen.
-- DROP IF EXISTS macht das Skript wiederholbar.
-- =====================================================================
begin;

alter table public.v7_employee_absences enable row level security;

drop policy if exists v7_employee_absences_select on public.v7_employee_absences;
drop policy if exists v7_employee_absences_insert on public.v7_employee_absences;
drop policy if exists v7_employee_absences_update on public.v7_employee_absences;
drop policy if exists v7_employee_absences_delete on public.v7_employee_absences;

-- SELECT: Berater/Firma sehen ihre MA; MA sieht sich selbst.
create policy v7_employee_absences_select
  on public.v7_employee_absences
  for select
  to public
  using (
    (employee_id in (
      select e.id from v7_employees e
       where v7_can_access_client(e.client_company_id)
    ))
    or
    (employee_id in (
      select e.id from v7_employees e
       where e.user_id = auth.uid()
    ))
  );

-- INSERT: WITH CHECK (true) - 1:1 aus DEV uebernommen.
-- ACHTUNG (bekannte Lockerung, bewusst NICHT geaendert): erlaubt jedem
-- Insert. Bitte separat entscheiden, ob wir das spaeter verschaerfen.
create policy v7_employee_absences_insert
  on public.v7_employee_absences
  for insert
  to public
  with check (true);

-- UPDATE: Berater immer; client_admin nur eigene Firma; MA nur sich selbst.
-- with_check war in DEV null -> USING gilt auch als CHECK (nicht setzen).
create policy v7_employee_absences_update
  on public.v7_employee_absences
  for update
  to public
  using (
    v7_is_consultant()
    or (
      v7_get_user_role() = 'client_admin'::v7_user_role
      and employee_id in (
        select e.id from v7_employees e
         where e.client_company_id = (
           select up.client_company_id
             from v7_user_profiles up
            where up.id = auth.uid()
         )
      )
    )
    or (employee_id in (
      select e.id from v7_employees e
       where e.user_id = auth.uid()
    ))
  );

-- DELETE: nur Berater oder client_admin.
create policy v7_employee_absences_delete
  on public.v7_employee_absences
  for delete
  to public
  using (
    v7_is_consultant()
    or v7_get_user_role() = 'client_admin'::v7_user_role
  );

commit;


-- =====================================================================
-- SCHRITT 2 - Sensible Backup-Tabelle absichern
-- v7_timesheets_absence_backup_20260624 liegt mit RLS=false offen und
-- enthaelt dieselben Abwesenheits-/Krankdaten. Default: RLS aktivieren
-- (dann kommt nur service_role ran; kein anon/authenticated-Zugriff).
-- =====================================================================
alter table public.v7_timesheets_absence_backup_20260624
  enable row level security;

-- ALTERNATIVE statt Schritt 2, falls das Backup nicht mehr gebraucht wird:
-- (dann Zeile oben NICHT ausfuehren, sondern diese - unwiderruflich!)
-- drop table public.v7_timesheets_absence_backup_20260624;


-- =====================================================================
-- SCHRITT 3 (Lese-Verifikation) - Soll nach der Migration zeigen:
--   v7_employee_absences               -> rls_aktiv=true, policies=4
--   v7_timesheets_absence_backup_...    -> rls_aktiv=true, policies=0
-- =====================================================================
select c.relname as tabelle,
       c.relrowsecurity as rls_aktiv,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('v7_employee_absences', 'v7_timesheets_absence_backup_20260624')
 order by c.relname;
