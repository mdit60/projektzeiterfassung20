-- =====================================================================
-- SQL-MIGRATION-employee-absences-rls-dev-v1.sql
-- Ziel-DB : DEV  (projektzeiterfassung20, ref jaiyycmstgepxaqsvnjd)
-- Zweck   : Offene Backup-Tabelle in DEV absichern, damit DEV und PROD
--           symmetrisch sind. Backup wird AUFGEHOBEN (nur gesichert,
--           nicht geloescht).
-- Kontext : In DEV ist v7_employee_absences bereits abgesichert
--           (RLS an, 4 Policies) - daran wird NICHTS geaendert.
--           Offen ist nur v7_timesheets_absence_backup_20260624.
-- Hinweis : Ausfuehrung durch Martin im DEV-SQL-Editor. NICHT in PROD.
-- =====================================================================


-- =====================================================================
-- SCHRITT 1 - Backup-Tabelle absichern (RLS an, ohne Policies).
-- Danach kommt nur service_role heran; kein anon/authenticated-Zugriff.
-- =====================================================================
alter table public.v7_timesheets_absence_backup_20260624
  enable row level security;


-- =====================================================================
-- SCHRITT 2 (Lese-Verifikation) - Soll danach zeigen:
--   v7_employee_absences               -> rls_aktiv=true, policies=4  (unveraendert)
--   v7_timesheets_absence_backup_...    -> rls_aktiv=true, policies=0  (neu gesichert)
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
