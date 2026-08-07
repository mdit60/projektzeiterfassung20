-- =====================================================================
-- SQL-MIGRATION-verwendungsnachweis-v1.sql
-- PZE V7 - VN-Modul (Verwendungsnachweis), MVP DS De-minimis
-- Version : v2
-- Datum   : 29.07.2026
-- Ausfuehren in: DEV UND PROD (identisch)
-- Bezug   : KONZEPT-VERWENDUNGSNACHWEIS-v1_0.md
-- --------------------------------------------------------------------
-- ZWECK
--   1) Neue Tabelle v7_verwendungsnachweise (nur Sachbericht + Metadaten;
--      alle Zahlen werden zur Laufzeit aus den ZAs/Timesheets aggregiert,
--      NICHT gedoppelt).
--   2) Neue Spalte v7_projects.beihilfe_basis (vorbereitend fuer AGVO;
--      im MVP nur 'de_minimis' genutzt).
--   3) RLS auf v7_verwendungsnachweise (projektbezogen, analog zur
--      Zugriffslogik von v7_employee_absences / v7_zahlungsanforderungen).
--
-- HINWEIS RLS (bitte pruefen)
--   Die Policies unten spiegeln die projektbezogene Zugriffslogik ueber
--   den Helfer v7_can_access_client(<firma>) (wie v7_employee_absences).
--   Vor PROD bitte gegen die real gesetzten Policies von
--   v7_zahlungsanforderungen abgleichen, damit VN und ZA deckungsgleich
--   berechtigt sind (VN ist das Projekt-Geschwister der ZA).
--
-- SICHERHEIT
--   Alles transaktional (begin/commit). DROP IF EXISTS -> wiederholbar.
--   Keine bestehenden Daten werden veraendert.
-- =====================================================================


-- =====================================================================
-- SCHRITT 0 (ZUERST, separat ausfuehren) - reiner Lese-Vorabcheck
-- Prueft, ob die benoetigten Helfer + Zieltabellen existieren.
-- Erwartetes Ergebnis: 6 Zeilen (3 Funktionen + 1 Typ + 2 Tabellen).
-- Fehlt eine Zeile -> STOPP und erst melden.
-- =====================================================================
select 'function' as art, proname as name
  from pg_proc
 where proname in ('v7_can_access_client', 'v7_is_consultant', 'v7_get_user_role')
union all
select 'type' as art, typname as name
  from pg_type
 where typname = 'v7_user_role'
union all
select 'table' as art, relname as name
  from pg_class
 where relname in ('v7_projects', 'v7_zahlungsanforderungen')
   and relkind = 'r'
 order by art, name;


-- =====================================================================
-- SCHRITT 1 - Spalte v7_projects.beihilfe_basis (vorbereitend)
-- Textspalte + CHECK (kein Enum, damit spaeter leicht erweiterbar).
-- Default 'de_minimis' - der Regelfall; AGVO wird spaeter gezielt gesetzt.
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
-- SCHRITT 2 - Tabelle v7_verwendungsnachweise
-- Nur Sachbericht-Texte + Metadaten. Zahlen kommen zur Laufzeit aus
-- v7_zahlungsanforderungen + Timesheets (Read-Rollup, VN-08).
-- =====================================================================
begin;

create table if not exists public.v7_verwendungsnachweise (
  id                        uuid primary key default gen_random_uuid(),
  project_id                uuid not null references public.v7_projects(id) on delete cascade,

  -- Modus + Variante (MVP: art='schluss', variante='DS_DEMINIMIS')
  art                       text not null default 'schluss'
                              check (art in ('zwischen', 'schluss')),
  variante                  text not null default 'DS_DEMINIMIS'
                              check (variante in ('EP_KOOP','DS_AGVO','DS_DEMINIMIS','NW_PH1','NW_PH2')),
  formular_version          text,

  -- Berichtszeitraum (frei waehlbar; Default = Projektlaufzeit)
  berichtszeitraum_von      date,
  berichtszeitraum_bis      date,

  -- Sachbericht (Freitexte gemaess Formular-Teilen, DS oAGVO)
  sachbericht_ergebnis      text,   -- Zusammenfassung / Ergebnis der DS
  sachbericht_arbeitspakete text,   -- AP-Soll-Ist (Inhalt + Personenmonate)
  sachbericht_auftraege     text,   -- Auftrag an wiss. qual. Dritte (Anlage 6.3)
  sachbericht_kooperation   text,   -- Kooperationspartner ja/nein + Text
  sachbericht_weiteres      text,   -- Ergebnisse, Zielvergleich, Erfolgsaussichten

  status                    text not null default 'Entwurf'
                              check (status in ('Entwurf', 'Fertig')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists v7_verwendungsnachweise_project_idx
  on public.v7_verwendungsnachweise (project_id);

commit;


-- =====================================================================
-- SCHRITT 3 - RLS auf v7_verwendungsnachweise (projektbezogen)
-- Lesen/Schreiben nur fuer Nutzer, die die zugehoerige Kundenfirma
-- sehen duerfen (v7_can_access_client ueber v7_projects.client_company_id).
-- Schreiben zusaetzlich auf Berater bzw. client_admin der Firma begrenzt.
-- =====================================================================
begin;

alter table public.v7_verwendungsnachweise enable row level security;

drop policy if exists v7_verwendungsnachweise_select on public.v7_verwendungsnachweise;
drop policy if exists v7_verwendungsnachweise_insert on public.v7_verwendungsnachweise;
drop policy if exists v7_verwendungsnachweise_update on public.v7_verwendungsnachweise;
drop policy if exists v7_verwendungsnachweise_delete on public.v7_verwendungsnachweise;

-- SELECT: jeder, der die Firma des Projekts sehen darf.
create policy v7_verwendungsnachweise_select
  on public.v7_verwendungsnachweise
  for select
  to public
  using (
    project_id in (
      select p.id from public.v7_projects p
       where v7_can_access_client(p.client_company_id)
    )
  );

-- INSERT: Berater immer; client_admin nur eigene Firma.
create policy v7_verwendungsnachweise_insert
  on public.v7_verwendungsnachweise
  for insert
  to public
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

-- UPDATE: Berater immer; client_admin nur eigene Firma.
create policy v7_verwendungsnachweise_update
  on public.v7_verwendungsnachweise
  for update
  to public
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

-- DELETE: nur Berater oder client_admin.
create policy v7_verwendungsnachweise_delete
  on public.v7_verwendungsnachweise
  for delete
  to public
  using (
    v7_is_consultant()
    or v7_get_user_role() = 'client_admin'::v7_user_role
  );

commit;


-- =====================================================================
-- SCHRITT 4 (Lese-Verifikation)
--   v7_verwendungsnachweise -> rls_aktiv=true, policies=4
--   v7_projects.beihilfe_basis existiert (Default 'de_minimis')
-- =====================================================================
select c.relname as tabelle,
       c.relrowsecurity as rls_aktiv,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname = 'v7_verwendungsnachweise';

select column_name, data_type, column_default
  from information_schema.columns
 where table_name = 'v7_projects' and column_name = 'beihilfe_basis';
