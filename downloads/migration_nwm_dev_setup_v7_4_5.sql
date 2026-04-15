-- ============================================================
-- MIGRATION: NWM DEV-Setup v7.4.5
-- Zweck:
--   1. Schema-Korrekturen DEV (NWM Datenmodell-Korrektur)
--   2. YachtConnect-Daten von PROD nach DEV kopieren
-- Datum: 8. April 2026
-- Ausfuehren: NUR in Supabase DEV (projektzeiterfassung20)
-- NIEMALS in PROD ausfuehren!
-- ============================================================

-- ============================================================
-- SICHERHEITSCHECK: Vor Ausfuehren bitte pruefen!
-- SELECT current_database();
-- Erwartetes Ergebnis: projektzeiterfassung20
-- ============================================================

-- ============================================================
-- TEIL 1: SCHEMA-KORREKTUREN DEV
-- ============================================================

-- ------------------------------------------------------------
-- 1a: Fehlende Spalten DEV/PROD-Paritaet
-- ------------------------------------------------------------
ALTER TABLE v7_client_companies
  ADD COLUMN IF NOT EXISTS standard_weekly_hours NUMERIC(4,1);

-- ------------------------------------------------------------
-- 1b: UNIQUE constraint in v7_netzwerk_eigenanteile aufheben
-- Mehrere Zeilen je Partner/Periode erlaubt (Korrekturrechnungen)
-- ------------------------------------------------------------
ALTER TABLE v7_netzwerk_eigenanteile
  DROP CONSTRAINT IF EXISTS v7_nwm_ea_unique;

-- ------------------------------------------------------------
-- 1b: Neue Felder in v7_netzwerk_eigenanteile
-- ------------------------------------------------------------
ALTER TABLE v7_netzwerk_eigenanteile
  ADD COLUMN IF NOT EXISTS ist_korrektur        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS korrektur_zu_id      UUID REFERENCES v7_netzwerk_eigenanteile(id),
  ADD COLUMN IF NOT EXISTS foerderquote_manuell BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- TEIL 2: YACHTCONNECT-DATEN EINSPIELEN
-- ============================================================

-- ------------------------------------------------------------
-- 2a: Vorhandene Daten in DEV bereinigen (falls vorhanden)
-- ------------------------------------------------------------
DO $$
BEGIN
  DELETE FROM v7_netzwerk_eigenanteile
    WHERE project_id = '5d73f3d3-b6c5-4368-b753-1dcf38c16102';
  DELETE FROM v7_netzwerk_partner
    WHERE project_id = '5d73f3d3-b6c5-4368-b753-1dcf38c16102';
  DELETE FROM v7_zahlungsanforderungen
    WHERE project_id = '5d73f3d3-b6c5-4368-b753-1dcf38c16102';
  DELETE FROM v7_projects
    WHERE id = '5d73f3d3-b6c5-4368-b753-1dcf38c16102';
  DELETE FROM v7_client_companies
    WHERE id = '21005b74-fccc-4736-91c6-3b9ae6967ea5';
  DELETE FROM v7_consultant_companies
    WHERE id = 'db94308e-f2d0-447b-8b67-96a4f4ef3d15';
  RAISE NOTICE 'Bereinigung abgeschlossen.';
END $$;

-- ------------------------------------------------------------
-- 2b: Consultant Company (Cubintec als Berater)
-- ------------------------------------------------------------
INSERT INTO v7_consultant_companies (
  id, name, short_name, street, zip_code, city, federal_state,
  contact_person, contact_email, contact_phone, website,
  tax_id, internal_notes, is_active, created_at, updated_at
) VALUES (
  'db94308e-f2d0-447b-8b67-96a4f4ef3d15',
  'Cubintec GmbH', 'Cubintec',
  'Rederstrasse 24', '97616', 'Bad Neustadt a.d. Saale', 'DE-BY',
  'Martin Ditscherlein', 'm.ditscherlein@cubintec.com', '+49 171 7088586',
  'https://www.cubintec.com',
  NULL, NULL, TRUE,
  '2026-02-16 10:35:18.001094+00',
  '2026-02-16 10:35:18.001094+00'
);

-- ------------------------------------------------------------
-- 2c: Client Company (Cubintec als Kundenfirma)
-- ------------------------------------------------------------
INSERT INTO v7_client_companies (
  id, consultant_company_id, name, short_name,
  street, zip_code, city, federal_state,
  contact_person, contact_email, contact_phone,
  internal_notes, is_active, created_at, updated_at,
  status, invitation_token, standard_weekly_hours
) VALUES (
  '21005b74-fccc-4736-91c6-3b9ae6967ea5',
  'db94308e-f2d0-447b-8b67-96a4f4ef3d15',
  'Cubintec GmbH', 'Cubintec',
  'Rederstrasse 24', '97616', 'Bad Neustadt an der Saale', 'Bayern',
  'Katrin Kirchner', 'k.kirchner@cubintec.com', '+49 9771 6353510',
  NULL, TRUE,
  '2026-03-22 14:51:55.264214+00',
  '2026-03-22 17:21:32.067164+00',
  'active',
  '344ce105-fcf4-4738-8581-65580f8253ff',
  38.0
);

-- ------------------------------------------------------------
-- 2d: Projekt YachtConnect
-- Korrekturen gg. PROD:
--   - phase2_start_datum: NULL
--   - foerdersatz_stufen: gueltig_ab auf start_date-Basis korrigiert
-- ------------------------------------------------------------
INSERT INTO v7_projects (
  id, client_company_id, name, short_name,
  funding_reference, funding_format,
  start_date, end_date,
  is_active, created_at, updated_at,
  project_status, workplan_locked,
  za_rhythmus, is_consortium_project,
  foerdersatz, overhead_t, overhead_nt, overhead_gleich,
  netzwerk_typ, netzwerk_phase,
  bewilligung_datum, phase2_start_datum,
  foerdersatz_stufen,
  nwm_bank_kontoinhaber, nwm_bank_name,
  nwm_rechnung_naechste, nwm_faelligkeitsfrist
) VALUES (
  '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
  '21005b74-fccc-4736-91c6-3b9ae6967ea5',
  'ZIM Innovationsnetzwerk Yacht Connect', 'YachtConnect',
  '16KN124502', 'ZIM_NETZWERK',
  '2025-08-01', '2027-07-31',
  TRUE,
  '2026-03-22 15:00:08.719157+00', NOW(),
  'active', FALSE, 'quarterly', FALSE,
  '80.00', '100.00', '100.00', FALSE,
  'national', 'phase2',
  '2025-08-01',
  NULL,
  '[
    {"laufzeitjahr": 1, "satz_percent": 70, "gueltig_ab": "2025-08-01"},
    {"laufzeitjahr": 2, "satz_percent": 50, "gueltig_ab": "2026-08-01"},
    {"laufzeitjahr": 3, "satz_percent": 30, "gueltig_ab": "2027-08-01"},
    {"laufzeitjahr": 4, "satz_percent": 30, "gueltig_ab": "2028-08-01"}
  ]'::jsonb,
  'Cubintec GmbH', 'Sparkasse Bad Neustadt',
  59, 30
);

-- ------------------------------------------------------------
-- 2e: Netzwerkpartner (8 Partner)
-- ------------------------------------------------------------
INSERT INTO v7_netzwerk_partner (
  id, project_id, name, rechtsform,
  ansprechpartner, email,
  adresse_strasse, adresse_plz, adresse_ort,
  ust_id, eigenanteil_quote, quote_manuell_gesperrt,
  ust_satz, beitritt_datum, austritt_datum,
  sort_order, notizen, created_at, updated_at
) VALUES
('36768f54-99ec-442c-a1da-cee779eb632b',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 'Global Maritime Management GmbH', 'GmbH',
 'Thomas Duehrkop', 't.duehrkop@gmm-yacht.de',
 'Buergermeister-Hergenhan-Strasse 18', '22946', 'Trittau',
 NULL, 12.50, FALSE, 19.00, '2025-08-01', NULL,
 0, NULL, '2026-03-26 15:59:30.471025+00', NOW()),

('4549a25d-1bc4-4ebf-908c-61eb2ea71f51',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 'Luebeck Yacht Trave Schiff GmbH', 'GmbH',
 'Till Schulze-Hagenest', 't.schulze-hagennest@luebeckyacht.de',
 'Einsiedelstr. 6', '23554', 'Luebeck',
 NULL, 12.50, FALSE, 19.00, '2025-08-01', NULL,
 1, NULL, '2026-03-26 15:59:44.612216+00', NOW()),

('9bfed0df-2cbd-4fe9-8004-397ef8af2e22',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 'Steuerkanzlei Robin Freund', NULL,
 'Robin Freund', 'robin.freund@steuerkanzlei-freund.de',
 'Fitzener Str. 5 a', '21514', 'Buechen',
 NULL, 12.50, FALSE, 19.00, '2025-08-01', NULL,
 2, NULL, '2026-03-26 16:00:01.690225+00', NOW()),

('93d993a3-8c47-45af-b9f6-75942a42778a',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 'ASsystem GmbH', 'GmbH',
 'Thomas Duehrkop', 't.duehrkop@assystem.de',
 'Buergermeister-Hergenhan-Strasse 18', '22946', 'Trittau',
 NULL, 12.50, FALSE, 19.00, '2025-08-01', NULL,
 3, NULL, '2026-03-26 18:26:08.810039+00', NOW()),

('ead4b07d-837d-45f5-89e7-aec80f1cf983',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 'Flensburger Yacht Service GmbH', 'GmbH',
 'Christoph Volkmann', NULL,
 NULL, NULL, NULL,
 NULL, 12.50, FALSE, 19.00, '2025-08-01', NULL,
 4, NULL, '2026-03-26 18:33:19.361509+00', NOW()),

('5a4f6296-659b-4e2c-b0b8-b640fa590c6d',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 'VoltaMove GmbH', 'GmbH',
 NULL, NULL, NULL, NULL, NULL,
 NULL, 12.50, FALSE, 19.00, '2025-08-01', NULL,
 5, NULL, '2026-03-26 18:41:25.430636+00', NOW()),

('f4cc6c6e-0787-451f-b17e-037d8f9283a5',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 'OpenZ Software GmbH', 'GmbH',
 'Stefan Zimmermann', NULL,
 'Weyerdeelen 19', '27726', 'Worpswede',
 NULL, 12.50, FALSE, 19.00, '2025-08-01', NULL,
 6, '+49 4792 954517', '2026-03-27 08:41:19.819318+00', NOW()),

('0b2cb732-27f0-4454-9974-6b3be3c8aef8',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 'BHT GmbH', 'GmbH',
 'Willi Brune', 'info@willi-brune.de',
 'Behrensstrasse 41', '50374', 'Erftstadt',
 NULL, 12.50, FALSE, 19.00, '2025-08-01', NULL,
 7, 'T +49-(0)2235-461164, F +49-(0)2235-461165',
 '2026-03-27 08:58:20.917226+00', NOW());

-- ------------------------------------------------------------
-- 2f: Zahlungsanforderungen (4 ZAs)
-- ------------------------------------------------------------
INSERT INTO v7_zahlungsanforderungen (
  id, project_id, za_nummer,
  zeitraum_von, zeitraum_bis,
  auftraege_dritte_t, auftraege_dritte_nt,
  fue_unterauftrag, zeitw_personalaufnahme,
  status, notizen, created_at, updated_at,
  eingereicht_am, bewilligt_am,
  nwm_personalkosten, nwm_kosten_dritte,
  nwm_kosten_uebrige, nwm_kosten_gesamt,
  laufzeitjahr, foerdersatz_percent
) VALUES
('283054a7-db01-4973-8e20-8ed17e8a8fd6',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102', 1,
 '2025-08-01', '2025-10-31',
 0.00, 0.00, 0.00, 0.00, 'bewilligt', NULL,
 '2026-03-22 20:01:43.530571+00', NOW(),
 '2026-03-27 09:33:40.143+00', '2026-03-27 23:32:01.228+00',
 37087.48, 0.00, 37087.48, 74174.95, 1, 70.00),

('66381878-f7c2-4673-85ea-2c80156f2ea8',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102', 2,
 '2025-11-01', '2025-11-30',
 0.00, 0.00, 0.00, 0.00, 'bewilligt', NULL,
 '2026-03-22 20:12:19.054373+00', NOW(),
 '2026-03-27 09:32:45.171+00', '2026-03-27 23:32:05.466+00',
 12357.53, 0.00, 12357.53, 24715.06, 1, 70.00),

('967347a5-2c3f-4bee-a7cc-85e3f24a45ae',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102', 3,
 '2025-12-01', '2026-01-31',
 0.00, 0.00, 0.00, 0.00, 'bewilligt', NULL,
 '2026-03-27 23:19:37.708931+00', NOW(),
 '2026-03-27 23:20:14.284+00', '2026-03-27 23:32:09.261+00',
 19111.84, 0.00, 19111.84, 38223.68, 1, 70.00),

('29143674-4a24-408b-a24c-6e23f245af3f',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102', 4,
 '2026-02-01', '2026-04-30',
 0.00, 0.00, 0.00, 0.00, 'entwurf', NULL,
 '2026-03-27 23:20:46.199569+00', NOW(),
 NULL, NULL,
 37695.38, 0.00, 37695.38, 75390.76, 1, 70.00);

-- ------------------------------------------------------------
-- 2g: Eigenanteile (24 Datensaetze, 3 Perioden x 8 Partner)
-- ------------------------------------------------------------

-- Periode 1: 2025-08-01 bis 2025-10-31 (NWM-Kosten: 74.174,95)
INSERT INTO v7_netzwerk_eigenanteile (
  id, project_id, partner_id, za_id,
  periode_von, periode_bis,
  nwm_kosten_gesamt, foerdersatz_percent, laufzeitjahr,
  eigenanteil_quote, anteil_gesamtleistung_netto,
  foerderanteil_pt, betrag_soll,
  ust_satz, ust_betrag, betrag_brutto,
  rechnung_nr, rechnung_datum,
  betrag_ist, eingegangen_am, mahnung_datum,
  status, notizen, ist_korrektur, foerderquote_manuell,
  created_at, updated_at
) VALUES
('e162f66d-a56f-4e54-9b8c-ec8ee6ea2e21',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '36768f54-99ec-442c-a1da-cee779eb632b', NULL,
 '2025-08-01', '2025-10-31',
 74174.95, 70.00, 1, 12.50, 9271.87, 6490.31, 2781.56,
 19.00, 1761.66, 4543.22, '260035', NULL,
 4543.29, '2025-11-26', NULL,
 'bezahlt', NULL, FALSE, FALSE,
 '2026-03-27 16:37:16.572267+00', NOW()),

('87f6ad88-47bc-43ab-a77e-479d95d239f0',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '4549a25d-1bc4-4ebf-908c-61eb2ea71f51', NULL,
 '2025-08-01', '2025-10-31',
 74174.95, 70.00, 1, 12.50, 9271.87, 6490.31, 2781.56,
 19.00, 1761.66, 4543.22, '260036', NULL,
 4543.29, '2025-11-13', NULL,
 'bezahlt', NULL, FALSE, FALSE,
 '2026-03-27 16:37:16.688663+00', NOW()),

('77d82374-1f68-4bbb-89a9-6292d2178658',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '9bfed0df-2cbd-4fe9-8004-397ef8af2e22', NULL,
 '2025-08-01', '2025-10-31',
 74174.95, 70.00, 1, 12.50, 9271.87, 6490.31, 2781.56,
 19.00, 1761.66, 4543.22, '260037', NULL,
 4543.29, '2025-11-25', NULL,
 'bezahlt', NULL, FALSE, FALSE,
 '2026-03-27 16:37:16.802047+00', NOW()),

('656a91e2-4f3a-465c-b5a6-40eb001bcf81',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '93d993a3-8c47-45af-b9f6-75942a42778a', NULL,
 '2025-08-01', '2025-10-31',
 74174.95, 70.00, 1, 12.50, 9271.87, 6490.31, 2781.56,
 19.00, 1761.66, 4543.22, '260038', NULL,
 4543.29, '2025-11-13', NULL,
 'bezahlt', NULL, FALSE, FALSE,
 '2026-03-27 16:37:16.923513+00', NOW()),

('9a608af0-32c9-41d8-aaba-0029750b1c28',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 'ead4b07d-837d-45f5-89e7-aec80f1cf983', NULL,
 '2025-08-01', '2025-10-31',
 74174.95, 70.00, 1, 12.50, 9271.87, 6490.31, 2781.56,
 19.00, 1761.66, 4543.22, '260039', NULL,
 4543.29, '2025-11-24', NULL,
 'bezahlt', NULL, FALSE, FALSE,
 '2026-03-27 16:37:17.062137+00', NOW()),

('03d1e67b-2270-46f3-bce7-111f9728047c',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '5a4f6296-659b-4e2c-b0b8-b640fa590c6d', NULL,
 '2025-08-01', '2025-10-31',
 74174.95, 70.00, 1, 12.50, 9271.87, 6490.31, 2781.56,
 19.00, 1761.66, 4543.22, '260040', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:37:17.182115+00', NOW()),

('dddc9ada-d452-438a-a8ae-1c2752900a16',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 'f4cc6c6e-0787-451f-b17e-037d8f9283a5', NULL,
 '2025-08-01', '2025-10-31',
 74174.95, 70.00, 1, 12.50, 9271.87, 6490.31, 2781.56,
 19.00, 1761.66, 4543.22, '260041', NULL,
 4543.29, '2025-11-11', NULL,
 'bezahlt', NULL, FALSE, FALSE,
 '2026-03-27 16:37:17.291302+00', NOW()),

('b478acb7-4719-427e-a3b4-7c5f67e012c3',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '0b2cb732-27f0-4454-9974-6b3be3c8aef8', NULL,
 '2025-08-01', '2025-10-31',
 74174.95, 70.00, 1, 12.50, 9271.90, 6490.33, 2781.57,
 19.00, 1761.66, 4543.23, '260042', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:37:17.411519+00', NOW()),

-- Periode 2: 2025-11-01 bis 2025-11-30 (NWM-Kosten: 24.715,06)
('0dbf13ea-59d4-4752-bc31-2c873354887f',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '36768f54-99ec-442c-a1da-cee779eb632b', NULL,
 '2025-11-01', '2025-11-30',
 24715.06, 70.00, 1, 12.50, 3089.37, 2162.56, 926.81,
 19.00, 586.98, 1513.79, '260035', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:39:20.237592+00', NOW()),

('94ca42aa-623c-4622-8575-4a3211608363',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '4549a25d-1bc4-4ebf-908c-61eb2ea71f51', NULL,
 '2025-11-01', '2025-11-30',
 24715.06, 70.00, 1, 12.50, 3089.37, 2162.56, 926.81,
 19.00, 586.98, 1513.79, '260036', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:39:20.351353+00', NOW()),

('9ccbcd68-d014-4f8c-8f68-a98b0b757637',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '9bfed0df-2cbd-4fe9-8004-397ef8af2e22', NULL,
 '2025-11-01', '2025-11-30',
 24715.06, 70.00, 1, 12.50, 3089.37, 2162.56, 926.81,
 19.00, 586.98, 1513.79, '260037', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:39:20.458072+00', NOW()),

('5ce134dc-88ae-4155-a0f0-c7171def5de0',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '93d993a3-8c47-45af-b9f6-75942a42778a', NULL,
 '2025-11-01', '2025-11-30',
 24715.06, 70.00, 1, 12.50, 3089.37, 2162.56, 926.81,
 19.00, 586.98, 1513.79, '260038', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:39:20.56603+00', NOW()),

('8de4b11c-d8c4-46c9-ac76-c5a75801b970',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 'ead4b07d-837d-45f5-89e7-aec80f1cf983', NULL,
 '2025-11-01', '2025-11-30',
 24715.06, 70.00, 1, 12.50, 3089.37, 2162.56, 926.81,
 19.00, 586.98, 1513.79, '260039', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:39:20.687604+00', NOW()),

('c9874e80-b5dc-47e5-b9b9-3f8e668debe2',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '5a4f6296-659b-4e2c-b0b8-b640fa590c6d', NULL,
 '2025-11-01', '2025-11-30',
 24715.06, 70.00, 1, 12.50, 3089.37, 2162.56, 926.81,
 19.00, 586.98, 1513.79, '260040', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:39:20.811062+00', NOW()),

('9442d6eb-3d10-4bac-a34e-6a47d65324b2',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 'f4cc6c6e-0787-451f-b17e-037d8f9283a5', NULL,
 '2025-11-01', '2025-11-30',
 24715.06, 70.00, 1, 12.50, 3089.37, 2162.56, 926.81,
 19.00, 586.98, 1513.79, '260041', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:39:20.918818+00', NOW()),

('61d20165-fb47-4dc7-a25e-6d67cc8cdeb6',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '0b2cb732-27f0-4454-9974-6b3be3c8aef8', NULL,
 '2025-11-01', '2025-11-30',
 24715.06, 70.00, 1, 12.50, 3089.50, 2162.65, 926.85,
 19.00, 587.01, 1513.86, '260042', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:39:21.019224+00', NOW()),

-- Periode 3: 2025-12-01 bis 2026-02-28 (NWM-Kosten: 38.223,68)
('d2be0b5f-ea3d-4a67-8775-da70805250b4',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '36768f54-99ec-442c-a1da-cee779eb632b', NULL,
 '2025-12-01', '2026-02-28',
 38223.68, 70.00, 1, 12.50, 4777.93, 3344.55, 1433.38,
 19.00, 907.81, 2341.19, '260043', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:43:27.569406+00', NOW()),

('00d4aea0-b759-43c9-b19d-4f8ed615cfd5',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '4549a25d-1bc4-4ebf-908c-61eb2ea71f51', NULL,
 '2025-12-01', '2026-02-28',
 38223.68, 70.00, 1, 12.50, 4777.93, 3344.55, 1433.38,
 19.00, 907.81, 2341.19, '260044', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:43:27.667863+00', NOW()),

('4021204c-6ec0-465f-9f6d-f38390c25d95',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '9bfed0df-2cbd-4fe9-8004-397ef8af2e22', NULL,
 '2025-12-01', '2026-02-28',
 38223.68, 70.00, 1, 12.50, 4777.93, 3344.55, 1433.38,
 19.00, 907.81, 2341.19, '260045', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:43:27.776342+00', NOW()),

('b0a143c4-2623-410d-b258-186aad9d8fbd',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '93d993a3-8c47-45af-b9f6-75942a42778a', NULL,
 '2025-12-01', '2026-02-28',
 38223.68, 70.00, 1, 12.50, 4777.93, 3344.55, 1433.38,
 19.00, 907.81, 2341.19, '260046', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:43:27.884304+00', NOW()),

('0fc8a0d9-c295-4887-9160-81c06c3ee091',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 'ead4b07d-837d-45f5-89e7-aec80f1cf983', NULL,
 '2025-12-01', '2026-02-28',
 38223.68, 70.00, 1, 12.50, 4777.93, 3344.55, 1433.38,
 19.00, 907.81, 2341.19, '260047', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:43:28.001671+00', NOW()),

('d1a22342-7c74-444d-ac44-c0aa61277942',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '5a4f6296-659b-4e2c-b0b8-b640fa590c6d', NULL,
 '2025-12-01', '2026-02-28',
 38223.68, 70.00, 1, 12.50, 4777.93, 3344.55, 1433.38,
 19.00, 907.81, 2341.19, '260048', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:43:28.113805+00', NOW()),

('98b34b71-876e-4f2e-9359-347b926d05f2',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 'f4cc6c6e-0787-451f-b17e-037d8f9283a5', NULL,
 '2025-12-01', '2026-02-28',
 38223.68, 70.00, 1, 12.50, 4777.93, 3344.55, 1433.38,
 19.00, 907.81, 2341.19, '260049', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:43:28.208913+00', NOW()),

('7e123046-bcf5-4c6e-9b50-d9b14714348a',
 '5d73f3d3-b6c5-4368-b753-1dcf38c16102',
 '0b2cb732-27f0-4454-9974-6b3be3c8aef8', NULL,
 '2025-12-01', '2026-02-28',
 38223.68, 70.00, 1, 12.50, 4778.13, 3344.69, 1433.44,
 19.00, 907.84, 2341.28, '260050', NULL,
 NULL, NULL, NULL,
 'offen', NULL, FALSE, FALSE,
 '2026-03-27 16:43:28.324382+00', NOW());

-- ============================================================
-- TEIL 3: VERIFICATION
-- ============================================================
SELECT 'v7_consultant_companies'   AS tabelle, COUNT(*) AS anzahl
  FROM v7_consultant_companies
  WHERE id = 'db94308e-f2d0-447b-8b67-96a4f4ef3d15'
UNION ALL
SELECT 'v7_client_companies',       COUNT(*)
  FROM v7_client_companies
  WHERE id = '21005b74-fccc-4736-91c6-3b9ae6967ea5'
UNION ALL
SELECT 'v7_projects',               COUNT(*)
  FROM v7_projects
  WHERE id = '5d73f3d3-b6c5-4368-b753-1dcf38c16102'
UNION ALL
SELECT 'v7_netzwerk_partner',       COUNT(*)
  FROM v7_netzwerk_partner
  WHERE project_id = '5d73f3d3-b6c5-4368-b753-1dcf38c16102'
UNION ALL
SELECT 'v7_netzwerk_eigenanteile',  COUNT(*)
  FROM v7_netzwerk_eigenanteile
  WHERE project_id = '5d73f3d3-b6c5-4368-b753-1dcf38c16102'
UNION ALL
SELECT 'v7_zahlungsanforderungen',  COUNT(*)
  FROM v7_zahlungsanforderungen
  WHERE project_id = '5d73f3d3-b6c5-4368-b753-1dcf38c16102';

-- Erwartete Ergebnisse:
-- v7_consultant_companies:    1
-- v7_client_companies:        1
-- v7_projects:                1
-- v7_netzwerk_partner:        8
-- v7_netzwerk_eigenanteile:  24
-- v7_zahlungsanforderungen:   4

-- Schema-Check neue Felder:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'v7_netzwerk_eigenanteile'
  AND column_name IN ('ist_korrektur', 'korrektur_zu_id', 'foerderquote_manuell')
ORDER BY column_name;

-- Erwartete Ergebnisse:
-- foerderquote_manuell  boolean
-- ist_korrektur         boolean
-- korrektur_zu_id       uuid

-- ============================================================
-- ENDE MIGRATION NWM DEV-SETUP v7.4.5
-- ============================================================
