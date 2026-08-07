-- =====================================================================
-- SQL-MIGRATION-timesheet-completions-update-policy-prod-v1.sql
-- Ziel-DB : PROD  (PZE-production, ref cnnuyioklhlrfygwticf)
-- Zweck   : In PROD fehlende UPDATE-Policy auf v7_timesheet_completions
--           ergaenzen. Ohne sie schlaegt der App-upsert (INSERT ON
--           CONFLICT DO UPDATE, TimesheetForm Z.2344) im Konfliktfall
--           fehl, weil der UPDATE-Pfad von RLS blockiert wird.
-- Stil    : an die 3 vorhandenen PROD-Policies (completions_*) angeglichen
--           (to public + auth.role()='authenticated'). Funktional identisch
--           zur DEV-Policy tc_update_authenticated.
-- Risiko  : additive Aenderung, kein RLS-Toggle -> kein Zeitfenster.
--           drop-if-exists macht das Skript wiederholbar.
-- Hinweis : Ausfuehrung durch Martin im PROD-SQL-Editor. NICHT in DEV
--           (DEV hat die UPDATE-Policy bereits).
-- =====================================================================


-- SCHRITT 1 (Vorabcheck, Lese) - erwartet 3 Policies, ohne update.
select policyname, cmd
  from pg_policies
 where schemaname = 'public' and tablename = 'v7_timesheet_completions'
 order by policyname;


-- SCHRITT 2 - fehlende UPDATE-Policy anlegen.
drop policy if exists completions_update on public.v7_timesheet_completions;

create policy completions_update
  on public.v7_timesheet_completions
  for update
  to public
  using (auth.role() = 'authenticated'::text)
  with check (auth.role() = 'authenticated'::text);


-- SCHRITT 3 (Verifikation, Lese) - erwartet jetzt 4 Policies inkl.
-- completions_update. Danach ist PROD deckungsgleich zu DEV (4 Policies).
select policyname, cmd, roles::text
  from pg_policies
 where schemaname = 'public' and tablename = 'v7_timesheet_completions'
 order by policyname;
