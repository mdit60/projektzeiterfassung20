-- ============================================================
-- MIGRATION: NWM-Modul v7.4.5
-- Netzwerkmanagement-Modul fuer ZIM_NETZWERK-Projekte
-- Datum: 26. Maerz 2026
-- Ausfuehren in: Supabase SQL-Editor (DEV zuerst, dann PROD)
-- ============================================================

-- ------------------------------------------------------------
-- SCHRITT 1: Erweiterung v7_projects
-- NWM-spezifische Felder fuer Foerdersatz-Stufen,
-- Bewilligungsdaten, Bankdaten und Rechnungskonfiguration
-- ------------------------------------------------------------

ALTER TABLE v7_projects
  -- Netzwerktyp und Phase
  ADD COLUMN IF NOT EXISTS netzwerk_typ          TEXT,
  -- 'national' | 'international'

  ADD COLUMN IF NOT EXISTS netzwerk_phase        TEXT,
  -- 'phase1' | 'phase2'

  -- Bewilligungsdaten (Startpunkt Laufzeitjahr-Berechnung)
  ADD COLUMN IF NOT EXISTS bewilligung_datum     DATE,
  -- Datum Zuwendungsbescheid Phase 1

  ADD COLUMN IF NOT EXISTS phase2_start_datum    DATE,
  -- Datum Bewilligung Phase 2 (NULL solange in Phase 1)

  -- Foerdersatz-Stufen (automatisch befuellt, manuell ueberschreibbar)
  -- Struktur: [{"laufzeitjahr":1,"satz_percent":70,"gueltig_ab":"2025-04-01"},...]
  ADD COLUMN IF NOT EXISTS foerdersatz_stufen    JSONB,

  -- Bankdaten Cubintec (fuer Rechnungsstellung an NP)
  ADD COLUMN IF NOT EXISTS nwm_bank_kontoinhaber TEXT,
  ADD COLUMN IF NOT EXISTS nwm_bank_iban         TEXT,
  ADD COLUMN IF NOT EXISTS nwm_bank_bic          TEXT,
  ADD COLUMN IF NOT EXISTS nwm_bank_name         TEXT,

  -- USt-ID Cubintec (Rechnungssteller)
  ADD COLUMN IF NOT EXISTS nwm_ust_id            TEXT,

  -- Rechnungskonfiguration
  ADD COLUMN IF NOT EXISTS nwm_rechnung_prefix   TEXT,
  -- Praefix fuer Rechnungsnummer, z.B. '25' fuer JJNNNN-Format
  -- NULL = automatisch aus aktuellem Jahr (2-stellig)

  ADD COLUMN IF NOT EXISTS nwm_rechnung_naechste INTEGER DEFAULT 1,
  -- Naechste laufende Nummer (wird nach Rechnungserstellung hochgezaehlt)

  ADD COLUMN IF NOT EXISTS nwm_faelligkeitsfrist INTEGER DEFAULT 30;
  -- Zahlungsfrist in Tagen (Standard 30)

-- Hinweise zu den neuen Feldern:
-- nwm_bank_iban: Format DE12 3456 7890 1234 5678 90 (mit/ohne Leerzeichen)
-- nwm_rechnung_prefix: '25' -> Rechnungen 250001, 250002 etc.
--                      NULL -> automatisch zweistelliges Jahressuffix
-- nwm_rechnung_naechste: Wird nach Erstellung automatisch inkrementiert

-- ------------------------------------------------------------
-- SCHRITT 2: Erweiterung v7_zahlungsanforderungen
-- NWM-spezifische Kostenfelder (nur bei ZIM_NETZWERK befuellt)
-- ------------------------------------------------------------

ALTER TABLE v7_zahlungsanforderungen
  ADD COLUMN IF NOT EXISTS nwm_personalkosten    NUMERIC(14,2),
  -- Aus ZE berechnet: foerderfaehige Stunden x hourly_rate_approved

  ADD COLUMN IF NOT EXISTS nwm_kosten_dritte     NUMERIC(14,2),
  -- Manuell: Auftraege an Dritte (max. 25% Gesamtkosten national)

  ADD COLUMN IF NOT EXISTS nwm_kosten_uebrige    NUMERIC(14,2),
  -- Automatisch: = nwm_personalkosten x 100% (pauschal lt. Richtlinie)

  ADD COLUMN IF NOT EXISTS nwm_kosten_gesamt     NUMERIC(14,2),
  -- = nwm_personalkosten + nwm_kosten_dritte + nwm_kosten_uebrige

  ADD COLUMN IF NOT EXISTS laufzeitjahr          INTEGER,
  -- Automatisch berechnet aus bewilligung_datum + ZA-Periode

  ADD COLUMN IF NOT EXISTS foerdersatz_percent   NUMERIC(5,2),
  -- Automatisch aus foerdersatz_stufen + laufzeitjahr

  ADD COLUMN IF NOT EXISTS eingereicht_am        DATE,
  -- Datum der Einreichung beim PT

  ADD COLUMN IF NOT EXISTS bewilligt_am          DATE;
  -- Datum der Bewilligung durch PT

-- ------------------------------------------------------------
-- SCHRITT 3: Neue Tabelle v7_netzwerk_partner
-- Netzwerkpartner eines ZIM_NETZWERK-Projekts
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS v7_netzwerk_partner (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,

  -- Stammdaten
  name                     TEXT NOT NULL,
  rechtsform               TEXT,            -- GmbH, GbR, AG, UG, etc.
  ansprechpartner          TEXT,
  email                    TEXT,
  adresse_strasse          TEXT,
  adresse_plz              TEXT,
  adresse_ort              TEXT,
  ust_id                   TEXT,            -- USt-IdNr. des NP (fuer Rechnung)

  -- Quotenlogik
  eigenanteil_quote        NUMERIC(5,2) NOT NULL DEFAULT 0,
  -- Prozentualer Anteil 0.00 - 100.00
  -- Summe aller aktiven NP eines Projekts muss 100.00 ergeben

  quote_manuell_gesperrt   BOOLEAN NOT NULL DEFAULT FALSE,
  -- TRUE = diese Quote wird bei Auto-Anpassung nicht veraendert

  -- Umsatzsteuer
  ust_satz                 NUMERIC(4,2) NOT NULL DEFAULT 19.00,
  -- 0.00 = steuerbefreit | 19.00 = Standard

  -- Laufzeit
  beitritt_datum           DATE NOT NULL,
  austritt_datum           DATE,            -- NULL = aktiv

  sort_order               INTEGER DEFAULT 0,
  -- Reihenfolge in der Tabelle (fuer Smart-Anpassung und Anzeige)

  notizen                  TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT nwp_quote_range
    CHECK (eigenanteil_quote >= 0 AND eigenanteil_quote <= 100),
  CONSTRAINT nwp_ust_valid
    CHECK (ust_satz IN (0.00, 19.00))
);

CREATE INDEX IF NOT EXISTS idx_v7_nwp_project
  ON v7_netzwerk_partner(project_id);

CREATE INDEX IF NOT EXISTS idx_v7_nwp_aktiv
  ON v7_netzwerk_partner(project_id, austritt_datum)
  WHERE austritt_datum IS NULL;

CREATE TRIGGER v7_nwp_updated
  BEFORE UPDATE ON v7_netzwerk_partner
  FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();

ALTER TABLE v7_netzwerk_partner DISABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- SCHRITT 4: Neue Tabelle v7_netzwerk_eigenanteile
-- Quartalsweise Eigenanteil-Abrechnung pro NP
-- Unveraenderlicher Snapshot aller Berechnungsparameter
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS v7_netzwerk_eigenanteile (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                   UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,
  partner_id                   UUID NOT NULL REFERENCES v7_netzwerk_partner(id) ON DELETE CASCADE,
  za_id                        UUID REFERENCES v7_zahlungsanforderungen(id),
  -- Verknuepfung mit der zugehoerigen ZA (kann NULL sein wenn separat erstellt)

  -- Abrechnungsperiode
  periode_von                  DATE NOT NULL,
  periode_bis                  DATE NOT NULL,

  -- Berechnungs-Snapshot (werden beim Erstellen eingefroren, danach nicht mehr veraendert)
  nwm_kosten_gesamt            NUMERIC(14,2) NOT NULL,
  -- Netto-Gesamtkosten NWM im Quartal

  foerdersatz_percent          NUMERIC(5,2)  NOT NULL,
  -- Angewandter Foerdersatz zum Zeitpunkt der Berechnung

  laufzeitjahr                 INTEGER       NOT NULL,
  -- Laufzeitjahr zum Zeitpunkt der Berechnung

  eigenanteil_quote            NUMERIC(5,2)  NOT NULL,
  -- Quote des NP zum Berechnungszeitpunkt (Snapshot!)

  anteil_gesamtleistung_netto  NUMERIC(14,2) NOT NULL,
  -- = nwm_kosten_gesamt x eigenanteil_quote / 100

  foerderanteil_pt             NUMERIC(14,2) NOT NULL,
  -- = (nwm_kosten_gesamt x foerdersatz_percent / 100) x eigenanteil_quote / 100

  betrag_soll                  NUMERIC(14,2) NOT NULL,
  -- Eigenanteil netto = anteil_gesamtleistung_netto - foerderanteil_pt

  ust_satz                     NUMERIC(4,2)  NOT NULL,
  -- USt-Satz des NP zum Berechnungszeitpunkt (0.00 oder 19.00)

  ust_betrag                   NUMERIC(14,2) NOT NULL,
  -- = anteil_gesamtleistung_netto x ust_satz / 100

  betrag_brutto                NUMERIC(14,2) NOT NULL,
  -- = betrag_soll + ust_betrag

  -- Rechnungsdaten
  rechnung_nr                  TEXT,
  -- Format: JJNNNN z.B. '250012'

  rechnung_datum               DATE,

  -- Zahlungsstatus
  betrag_ist                   NUMERIC(14,2),
  -- Tatsaechlich eingegangener Brutto-Betrag

  eingegangen_am               DATE,
  -- Datum Zahlungseingang

  mahnung_datum                DATE,
  -- Datum der Mahnung (NULL = nicht gemahnt)

  status                       TEXT NOT NULL DEFAULT 'offen',
  -- 'offen' | 'bezahlt' | 'gemahnt' | 'storniert'

  notizen                      TEXT,
  created_at                   TIMESTAMPTZ DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT v7_nwm_ea_unique
    UNIQUE (partner_id, periode_von, periode_bis),

  CONSTRAINT v7_nwm_ea_status_valid
    CHECK (status IN ('offen', 'bezahlt', 'gemahnt', 'storniert'))
);

CREATE INDEX IF NOT EXISTS idx_v7_nwm_ea_project
  ON v7_netzwerk_eigenanteile(project_id);

CREATE INDEX IF NOT EXISTS idx_v7_nwm_ea_partner
  ON v7_netzwerk_eigenanteile(partner_id);

CREATE INDEX IF NOT EXISTS idx_v7_nwm_ea_za
  ON v7_netzwerk_eigenanteile(za_id);

CREATE INDEX IF NOT EXISTS idx_v7_nwm_ea_status
  ON v7_netzwerk_eigenanteile(project_id, status);

CREATE TRIGGER v7_nwm_ea_updated
  BEFORE UPDATE ON v7_netzwerk_eigenanteile
  FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();

ALTER TABLE v7_netzwerk_eigenanteile DISABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- SCHRITT 5: Verification
-- Nach Ausfuehren pruefen ob alles korrekt angelegt wurde
-- ------------------------------------------------------------

-- Neue Spalten in v7_projects pruefen:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'v7_projects'
  AND column_name IN (
    'netzwerk_typ', 'netzwerk_phase', 'bewilligung_datum',
    'phase2_start_datum', 'foerdersatz_stufen',
    'nwm_bank_iban', 'nwm_bank_bic', 'nwm_ust_id',
    'nwm_rechnung_prefix', 'nwm_rechnung_naechste',
    'nwm_faelligkeitsfrist'
  )
ORDER BY column_name;

-- Neue Spalten in v7_zahlungsanforderungen pruefen:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'v7_zahlungsanforderungen'
  AND column_name IN (
    'nwm_personalkosten', 'nwm_kosten_dritte',
    'nwm_kosten_uebrige', 'nwm_kosten_gesamt',
    'laufzeitjahr', 'foerdersatz_percent',
    'eingereicht_am', 'bewilligt_am'
  )
ORDER BY column_name;

-- Neue Tabellen pruefen:
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('v7_netzwerk_partner', 'v7_netzwerk_eigenanteile')
  AND table_schema = 'public';

-- Spalten v7_netzwerk_partner:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'v7_netzwerk_partner'
ORDER BY ordinal_position;

-- Spalten v7_netzwerk_eigenanteile:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'v7_netzwerk_eigenanteile'
ORDER BY ordinal_position;

-- ============================================================
-- ENDE MIGRATION v7.4.5
-- ============================================================
