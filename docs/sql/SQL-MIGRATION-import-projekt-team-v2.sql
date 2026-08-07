-- ============================================================================
-- PZE V7 - Atomarer ZIM-Antragsimport (Kern: Projekt + Mitarbeiter + Team)
-- Migration: SQL-MIGRATION-import-projekt-team-v2.sql
-- v2: funding_format explizit auf Enum-Typ v7_funding_format casten (v1 scheiterte an
--     "column funding_format is of type v7_funding_format but expression is of type text").
-- ----------------------------------------------------------------------------
-- Auf BEIDEN Datenbanken ausfuehren (DEV: jaiyycmstgepxaqsvnjd, PROD: cnnuyioklhlrfygwticf).
--
-- v7_import_projekt_team(): legt Projekt + neue Mitarbeiter + Projektzuordnungen
--   in EINER Transaktion an. Bei jedem Fehler wird automatisch alles zurueckgerollt.
--   Rueckgabe: { project_id, new_employee_ids }.
--   Der Arbeitsplan wird danach ueber die bestehende arbeitsplan-import-Route
--   hinzugefuegt (nicht Teil dieser Funktion).
--
-- v7_cleanup_projekt(): entfernt ein angelegtes Projekt inkl. Zuordnungen,
--   Arbeitspaketen und (optional) den neu angelegten Mitarbeitern. Dient als
--   Kompensation, falls der Arbeitsplan-Schritt nach dem Kern fehlschlaegt.
-- ============================================================================

create or replace function v7_import_projekt_team(
  p_project jsonb,
  p_employees jsonb,
  p_assignments jsonb
) returns jsonb
language plpgsql
as $$
declare
  v_project_id uuid;
  v_emp_id uuid;
  v_map jsonb := '{}'::jsonb;
  v_new_ids uuid[] := array[]::uuid[];
  emp jsonb;
  asg jsonb;
begin
  -- 1) Projekt
  insert into v7_projects (
    client_company_id, name, short_name, funding_format, funding_reference,
    start_date, end_date, notes, pm_basis_weekly_hours, is_active
  ) values (
    (p_project->>'client_company_id')::uuid,
    p_project->>'name',
    nullif(p_project->>'short_name', ''),
    nullif(p_project->>'funding_format', '')::v7_funding_format,
    nullif(p_project->>'funding_reference', ''),
    nullif(p_project->>'start_date', '')::date,
    nullif(p_project->>'end_date', '')::date,
    nullif(p_project->>'notes', ''),
    nullif(p_project->>'pm_basis_weekly_hours', '')::numeric,
    true
  ) returning id into v_project_id;

  -- 2) Neue Mitarbeiter (Identitaet) + Map MA-Nr -> employee_id
  for emp in select * from jsonb_array_elements(coalesce(p_employees, '[]'::jsonb)) loop
    insert into v7_employees (
      client_company_id, display_name, first_name, last_name,
      qualification, position_title, weekly_hours, is_active
    ) values (
      (emp->>'client_company_id')::uuid,
      emp->>'display_name',
      nullif(emp->>'first_name', ''),
      nullif(emp->>'last_name', ''),
      nullif(emp->>'qualification', ''),
      nullif(emp->>'position_title', ''),
      nullif(emp->>'weekly_hours', '')::numeric,
      true
    ) returning id into v_emp_id;
    v_map := v_map || jsonb_build_object(emp->>'ma_nr', v_emp_id::text);
    v_new_ids := array_append(v_new_ids, v_emp_id);
  end loop;

  -- 3) Projektzuordnungen (Team) mit projektbezogenen Antragswerten
  for asg in select * from jsonb_array_elements(coalesce(p_assignments, '[]'::jsonb)) loop
    v_emp_id := coalesce(
      nullif(asg->>'employee_id', '')::uuid,
      (v_map->>(asg->>'ma_nr'))::uuid
    );
    if v_emp_id is null then
      raise exception 'Keine Mitarbeiter-Zuordnung fuer MA-Nr %', asg->>'ma_nr';
    end if;
    insert into v7_project_assignments (
      project_id, employee_id, employee_number,
      hourly_rate, hourly_rate_approved, monthly_gross_salary, additional_salary_components,
      personal_weekly_hours, company_weekly_hours, role_in_project,
      assignment_start, assignment_end, is_active
    ) values (
      v_project_id,
      v_emp_id,
      (asg->>'employee_number')::integer,
      nullif(asg->>'hourly_rate', '')::numeric,
      nullif(asg->>'hourly_rate_approved', '')::numeric,
      nullif(asg->>'monthly_gross_salary', '')::numeric,
      nullif(asg->>'additional_salary_components', '')::numeric,
      nullif(asg->>'personal_weekly_hours', '')::numeric,
      nullif(asg->>'company_weekly_hours', '')::numeric,
      nullif(asg->>'role_in_project', ''),
      nullif(asg->>'assignment_start', '')::date,
      nullif(asg->>'assignment_end', '')::date,
      true
    );
  end loop;

  return jsonb_build_object(
    'project_id', v_project_id,
    'new_employee_ids', to_jsonb(v_new_ids)
  );
end;
$$;

create or replace function v7_cleanup_projekt(
  p_project_id uuid,
  p_employee_ids uuid[]
) returns void
language plpgsql
as $$
begin
  delete from v7_work_package_assignments
    where work_package_id in (select id from v7_work_packages where project_id = p_project_id);
  delete from v7_work_packages where project_id = p_project_id;
  delete from v7_project_assignments where project_id = p_project_id;
  if p_employee_ids is not null and array_length(p_employee_ids, 1) > 0 then
    delete from v7_employees where id = any(p_employee_ids);
  end if;
  delete from v7_projects where id = p_project_id;
end;
$$;
