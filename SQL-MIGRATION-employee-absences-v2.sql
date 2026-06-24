-- ============================================================================
-- SQL-MIGRATION-employee-absences-v2.sql
-- A-034: Zentrale, projektuebergreifende Abwesenheiten (v7_employee_absences)
-- Konzept: KONZEPT-ABWESENHEITEN-ZENTRAL v1.1 (abgenommen)
-- ----------------------------------------------------------------------------
-- ZIEL-DB: PROD (cnnuyioklhlrfygwticf).  ABLEITUNG aus v1 (DEV).
-- Stand der Bestandspruefung: 24.06.2026 (Q1: U=561, K=70, S=126 roh / S=124
-- dedup; Q2 leer; D1 leer; S0b: Tabelle noch nicht vorhanden).
-- ----------------------------------------------------------------------------
-- UNTERSCHIED ZU v1 (DEV):
--   1. INSERT schliesst FEIERTAGS-S von vornherein aus (explizite, geprueft
--      Datums-/Bundesland-Liste). Backup und Deaktivierung bleiben breit:
--      Feiertags-S werden in v7_timesheets DEAKTIVIERT, aber NICHT migriert
--      (Feiertage werden in der App berechnet, nicht gespeichert).
--   2. KEIN RLS-Block (Block 6). RLS bleibt in PROD vorerst aus - parallel zu
--      v7_timesheets (RLS in PROD deaktiviert). Aktivierung gesammelt im
--      separaten RLS-Backlog-Punkt (DEV/PROD-Angleich).
--
-- Migriert ausschliesslich U / K / S(echt). KA (Kurzarbeit-Marker, 0h) und F
-- (Feiertag) bleiben unangetastet. Filter: absence_code NOT NULL AND
-- work_package_id IS NULL.
-- Backup VOR jeder Schreiboperation. Migrierte/deaktivierte Zeilen werden in
-- v7_timesheets nur is_active=false gesetzt, nicht geloescht (Rueckweg).
--
-- ERWARTUNG PROD nach Lauf:
--   v7_employee_absences aktiv = 636  (U=561, K=70, S=5)
--   Backup-Tabelle             = 757  (Rohzeilen inkl. Feiertags-S)
--   ts_rest_aktiv              = 0
--
-- Datum: 24.06.2026
-- ============================================================================


-- ============================================================================
-- BLOCK 1 : Tabelle + partieller UNIQUE-Index
--           SEPARAT ausfuehren. Reihenfolge im gekoppelten Deploy:
--           Block 1 -> Code-Deploy (Dual-Read) -> Block 2-4 -> Block 5.
-- ============================================================================
CREATE TABLE IF NOT EXISTS v7_employee_absences (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       uuid         NOT NULL REFERENCES v7_employees(id),
  client_company_id uuid         NOT NULL REFERENCES v7_client_companies(id),
  work_date         date         NOT NULL,
  absence_code      text         NOT NULL CHECK (absence_code IN ('U','K','S')),
  hours             numeric      NOT NULL,
  note              text,
  entered_by        uuid,
  entered_at        timestamptz,
  is_active         boolean      NOT NULL DEFAULT true,
  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now()
);

-- Eindeutigkeit: genau eine AKTIVE Abwesenheit je (MA, Tag);
-- Historie via is_active=false bleibt erlaubt.
CREATE UNIQUE INDEX IF NOT EXISTS ux_v7_employee_absences_active
  ON v7_employee_absences (employee_id, work_date)
  WHERE is_active = true;


-- ============================================================================
-- BLOCK 2-4 : Guard + Backup + Migration + Deaktivierung
--             IN EINER TRANSAKTION (alles oder nichts).
--             Bei Code-Konflikten bricht der Guard die Transaktion ab.
-- ============================================================================
BEGIN;

-- --- Guard: kein automatisches Raten bei Code-Konflikten ---
-- Bricht ab, falls fuer denselben (MA, Tag) verschiedene Codes ueber mehrere
-- Projekte stehen. In PROD laut Q2 (24.06.2026) leer.
DO $$
DECLARE konflikte int;
BEGIN
  SELECT count(*) INTO konflikte FROM (
    SELECT employee_id, work_date
    FROM v7_timesheets
    WHERE is_active = true
      AND absence_code IS NOT NULL
      AND work_package_id IS NULL
      AND absence_code IN ('U','K','S')
    GROUP BY employee_id, work_date
    HAVING count(DISTINCT absence_code) > 1
  ) x;
  IF konflikte > 0 THEN
    RAISE EXCEPTION 'ABBRUCH: % Code-Konflikt(e) (gleicher MA-Tag, verschiedene Codes ueber Projekte). Erst manuell klaeren (Q2).', konflikte;
  END IF;
END $$;

-- --- Backup ALLER zu deaktivierenden Zeilen (datierter Name; CREATE bricht ab,
--     falls Backup bereits existiert -> Schutz gegen Doppel-Migration).
--     Bewusst BREIT inkl. Feiertags-S -> vollstaendiger Rueckweg. ---
CREATE TABLE v7_timesheets_absence_backup_20260624 AS
SELECT *
FROM v7_timesheets
WHERE is_active = true
  AND absence_code IS NOT NULL
  AND work_package_id IS NULL
  AND absence_code IN ('U','K','S');

-- --- Migration nach v7_employee_absences (dedupliziert, OHNE Feiertags-S) ---
-- DISTINCT ON faltet Mehrfachzeilen GLEICHEN Codes (MA in mehreren Projekten)
-- auf EINE Abwesenheit; Stunden sind dabei identisch (Tagesstunden). Aeltester
-- Eintrag gewinnt (stabiler Tiebreaker).
-- note: aus v7_timesheets.notes (Notiz; description ist die Taetigkeits-
-- beschreibung der Arbeit und bei Abwesenheit irrelevant).
--
-- FEIERTAGS-S-AUSSCHLUSS (geprueft 24.06.2026): S-Zeilen an gesetzlichen
-- Feiertagen werden NICHT migriert (Feiertag wird berechnet). Bundesweite
-- Feiertage gelten fuer alle; die zwei regionalen Faelle (Fronleichnam NW,
-- Reformationstag SH) sind bundeslandbezogen. Echter Sonderurlaub bleibt:
-- 24.12./31.12. (Heiligabend/Silvester) und 02.01.2026 -> 5 Zeilen.
INSERT INTO v7_employee_absences
  (employee_id, client_company_id, work_date, absence_code, hours,
   note, entered_by, entered_at, is_active, created_at, updated_at)
SELECT DISTINCT ON (t.employee_id, t.work_date)
  t.employee_id,
  e.client_company_id,
  t.work_date,
  t.absence_code,
  t.hours,
  t.notes,
  t.entered_by,
  t.entered_at,
  true,
  now(),
  now()
FROM v7_timesheets t
JOIN v7_employees e         ON e.id  = t.employee_id
JOIN v7_client_companies cc ON cc.id = e.client_company_id
WHERE t.is_active = true
  AND t.absence_code IS NOT NULL
  AND t.work_package_id IS NULL
  AND t.absence_code IN ('U','K','S')
  AND NOT (
    t.absence_code = 'S'
    AND (
      -- bundesweite gesetzliche Feiertage (alle Bundeslaender)
      t.work_date IN (
        DATE '2025-04-18',  -- Karfreitag
        DATE '2025-04-21',  -- Ostermontag
        DATE '2025-05-01',  -- Tag der Arbeit
        DATE '2025-05-29',  -- Christi Himmelfahrt
        DATE '2025-06-09',  -- Pfingstmontag
        DATE '2025-10-03',  -- Tag der Deutschen Einheit
        DATE '2025-12-25',  -- 1. Weihnachtstag
        DATE '2025-12-26',  -- 2. Weihnachtstag
        DATE '2026-01-01',  -- Neujahr
        DATE '2026-04-03',  -- Karfreitag
        DATE '2026-04-06',  -- Ostermontag
        DATE '2026-05-01',  -- Tag der Arbeit
        DATE '2026-05-14',  -- Christi Himmelfahrt
        DATE '2026-05-25'   -- Pfingstmontag
      )
      -- regionale Feiertage (nur im qualifizierenden Bundesland)
      OR (t.work_date = DATE '2025-06-19'
          AND cc.federal_state IN ('Nordrhein-Westfalen','DE-NW'))  -- Fronleichnam
      OR (t.work_date = DATE '2025-10-31'
          AND cc.federal_state IN ('Schleswig-Holstein','DE-SH'))   -- Reformationstag
    )
  )
ORDER BY t.employee_id, t.work_date, t.created_at NULLS LAST, t.id;

-- --- Deaktivierung ALLER migrierten/erkannten Abwesenheits-Zeilen in
--     v7_timesheets (BREIT inkl. Feiertags-S). Nur U/K/S mit
--     work_package_id IS NULL; KA/F und Projektarbeit bleiben aktiv. ---
UPDATE v7_timesheets
SET is_active = false, updated_at = now()
WHERE is_active = true
  AND absence_code IS NOT NULL
  AND work_package_id IS NULL
  AND absence_code IN ('U','K','S');

COMMIT;


-- ============================================================================
-- BLOCK 5 : Verifikation (read-only; nach COMMIT ausfuehren)
-- ============================================================================
-- Erwartung PROD: absences_aktiv = 636, backup_zeilen = 757, ts_rest = 0.
-- (Backup != absences ist gewollt: Backup roh inkl. Feiertags-S, absences
--  dedupliziert und ohne Feiertage.)
SELECT
  (SELECT count(*) FROM v7_employee_absences WHERE is_active = true)
    AS absences_aktiv,
  (SELECT count(*) FROM v7_timesheets_absence_backup_20260624)
    AS backup_zeilen,
  (SELECT count(*) FROM v7_timesheets
     WHERE is_active = true AND absence_code IS NOT NULL
       AND work_package_id IS NULL AND absence_code IN ('U','K','S'))
    AS ts_rest_aktiv;

-- Summenabgleich je Code (Erwartung PROD: U=561, K=70, S=5).
SELECT absence_code, count(*) AS zeilen, sum(hours) AS summe_stunden
FROM v7_employee_absences
WHERE is_active = true
GROUP BY absence_code
ORDER BY absence_code;

-- Kontrolle der 5 verbliebenen S (echter Sonderurlaub):
SELECT a.work_date, a.hours, e.display_name, cc.name AS firma
FROM v7_employee_absences a
JOIN v7_employees e         ON e.id  = a.employee_id
JOIN v7_client_companies cc ON cc.id = a.client_company_id
WHERE a.is_active = true AND a.absence_code = 'S'
ORDER BY a.work_date, e.display_name;


-- ============================================================================
-- KEIN BLOCK 6 (RLS) in PROD - bewusst ausgelassen. v7_employee_absences
-- bleibt - wie v7_timesheets in PROD - vorerst ohne RLS. Aktivierung im
-- separaten RLS-Backlog-Punkt (DEV/PROD-Angleich, Helper v7_can_access_client
-- / v7_is_consultant / v7_get_user_role, Lesepfade testen).
-- ============================================================================
