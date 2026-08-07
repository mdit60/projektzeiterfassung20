-- =====================================================================
-- SQL-MIGRATION-verwendungsnachweis-snapshot-v1.sql
-- PZE V7 - VN-Modul: Umstellung auf reine Zahlenseite + Snapshot
-- Version : v1
-- Datum   : 30.07.2026
-- Ausfuehren in: DEV UND PROD (identisch)
-- Bezug   : KONZEPT-VERWENDUNGSNACHWEIS, Entscheidung "nur Zahlenseite +
--           gespeicherter VN mit Snapshot + Uebersicht" (GL 30.07.2026)
-- --------------------------------------------------------------------
-- AENDERUNG ggue. SQL-MIGRATION-verwendungsnachweis-v2.sql:
--   - Sachbericht ENTFAELLT (wird direkt im offiziellen PDF geschrieben):
--     die sachbericht_*-Spalten fallen weg.
--   - NEU: zahlen_snapshot (jsonb) haelt die berechneten VN-Zahlen zum
--     Zeitpunkt des Speicherns fest (Audit / Wiederoeffnen), plus
--     summe_kosten + zuwendung_gesamt als schnelle Listen-Spalten.
--
-- VORGEHEN
--   Die Tabelle ist neu und in DEV noch leer -> saubere Neuanlage per
--   DROP + CREATE (keine Daten betroffen). In PROD existiert sie noch
--   nicht -> DROP IF EXISTS ist ein No-op. Damit bringt EIN Skript beide
--   Umgebungen in die finale Form. beihilfe_basis bleibt unveraendert.
--
-- SICHERHEIT: transaktional; keine Bestandsdaten ausserhalb dieser neuen
--   (leeren) Tabelle werden angefasst.
-- =====================================================================


-- =====================================================================
-- SCHRITT 0 (ZUERST, separat) - Lese-Vorabcheck
-- Sicherstellen, dass die Tabelle (falls vorhanden) leer ist, bevor wir
-- sie neu anlegen. Erwartung: 0 (DEV frisch) oder Fehler "does not exist"
-- (PROD) - beides ok. Bei count > 0 STOPP und melden.
-- =====================================================================
-- select count(*) as bestehende_zeilen from public.v7_verwendungsnachweise;


-- =====================================================================
-- SCHRITT 1 - Vorbereitung: Spalte beihilfe_basis absichern (idempotent)
-- =====================================================================
begin;

alter table public.v7_projects
  add column if not exists beihilfe_basis text not null default 'de_minimis';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'v7_projects_beihilfe_basis_chk'
  ) then
    alter table public.v7_projects
      add constraint v7_projects_beihilfe_basis_chk
      check (beihilfe_basis in ('de_minimis', 'agvo'));
  end if;
end$$;

commit;


-- =====================================================================
-- SCHRITT 2 - Tabelle v7_verwendungsnachweise in finaler Form
-- (Sachbericht raus, Snapshot rein). Neuanlage, da leer.
-- =====================================================================
begin;

drop table if exists public.v7_verwendungsnachweise cascade;

create table public.v7_verwendungsnachweise (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references public.v7_projects(id) on delete cascade,

  art                   text not null default 'schluss'
                          check (art in ('zwischen', 'schluss')),
  variante              text not null default 'DS_DEMINIMIS'
                          check (variante in ('EP_KOOP','DS_AGVO','DS_DEMINIMIS','NW_PH1','NW_PH2')),
  formular_version      text,

  berichtszeitraum_von  date,
  berichtszeitraum_bis  date,

  -- Zahlen-Snapshot zum Zeitpunkt des Speicherns (Audit / Wiederoeffnen).
  zahlen_snapshot       jsonb,
  summe_kosten          numeric,     -- Schnellzugriff fuer die Uebersicht
  zuwendung_gesamt      numeric,     -- Schnellzugriff fuer die Uebersicht

  status                text not null default 'Erstellt'
                          check (status in ('Entwurf', 'Erstellt')),
  erstellt_am           timestamptz not null default now(),
  aktualisiert_am       timestamptz not null default now()
);

create index if not exists v7_verwendungsnachweise_project_idx
  on public.v7_verwendungsnachweise (project_id);

-- Ein Schluss-VN je Projekt (Wieder-Speichern aktualisiert denselben Satz).
create unique index if not exists v7_verwendungsnachweise_uniq_schluss
  on public.v7_verwendungsnachweise (project_id, art);

commit;


-- =====================================================================
-- SCHRITT 3 - RLS (projektbezogen, analog ZA / v7_employee_absences)
-- =====================================================================
begin;

alter table public.v7_verwendungsnachweise enable row level security;

drop policy if exists v7_verwendungsnachweise_select on public.v7_verwendungsnachweise;
drop policy if exists v7_verwendungsnachweise_insert on public.v7_verwendungsnachweise;
drop policy if exists v7_verwendungsnachweise_update on public.v7_verwendungsnachweise;
drop policy if exists v7_verwendungsnachweise_delete on public.v7_verwendungsnachweise;

create policy v7_verwendungsnachweise_select
  on public.v7_verwendungsnachweise for select to public
  using (
    project_id in (
      select p.id from public.v7_projects p
       where v7_can_access_client(p.client_company_id)
    )
  );

create policy v7_verwendungsnachweise_insert
  on public.v7_verwendungsnachweise for insert to public
  with check (
    v7_is_consultant()
    or (
      v7_get_user_role() = 'client_admin'::v7_user_role
      and project_id in (
        select p.id from public.v7_projects p
         where p.client_company_id = (
           select up.client_company_id from public.v7_user_profiles up
            where up.id = auth.uid()
         )
      )
    )
  );

create policy v7_verwendungsnachweise_update
  on public.v7_verwendungsnachweise for update to public
  using (
    v7_is_consultant()
    or (
      v7_get_user_role() = 'client_admin'::v7_user_role
      and project_id in (
        select p.id from public.v7_projects p
         where p.client_company_id = (
           select up.client_company_id from public.v7_user_profiles up
            where up.id = auth.uid()
         )
      )
    )
  );

create policy v7_verwendungsnachweise_delete
  on public.v7_verwendungsnachweise for delete to public
  using (
    v7_is_consultant()
    or v7_get_user_role() = 'client_admin'::v7_user_role
  );

commit;


-- =====================================================================
-- SCHRITT 4 (Lese-Verifikation)
--   v7_verwendungsnachweise -> rls_aktiv=true, policies=4
--   Spalten zahlen_snapshot / summe_kosten / zuwendung_gesamt vorhanden,
--   sachbericht_* NICHT mehr vorhanden.
-- =====================================================================
select c.relname as tabelle, c.relrowsecurity as rls_aktiv,
       (select count(*) from pg_policies p
         where p.schemaname='public' and p.tablename=c.relname) as policies
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname='v7_verwendungsnachweise';

select column_name, data_type
  from information_schema.columns
 where table_name='v7_verwendungsnachweise'
 order by ordinal_position;
