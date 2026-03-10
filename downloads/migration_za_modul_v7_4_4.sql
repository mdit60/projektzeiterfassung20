-- ============================================================
-- MIGRATION: ZA-Modul v7.4.4
-- Zahlungsanforderung fuer ZIM-Projekte
-- Datum: 10. Maerz 2026
-- Ausfuehren in: Supabase SQL-Editor (DEV + PROD separat)
-- ============================================================

-- ------------------------------------------------------------
-- SCHRITT 1: Neue Felder in v7_projects
-- Foerdersatz und Gemeinkostenzuschlaege projektspezifisch
-- ------------------------------------------------------------

ALTER TABLE v7_projects
  ADD COLUMN IF NOT EXISTS foerdersatz     NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS overhead_t      NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS overhead_nt     NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS overhead_gleich BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS workplan_locked BOOLEAN DEFAULT false;

-- Hinweis:
-- foerdersatz:     Foerdersatz in % (z.B. 45.00 fuer ZIM KMU)
-- overhead_t:      Gemeinkostenzuschlag technisch in % (z.B. 28.42)
-- overhead_nt:     Gemeinkostenzuschlag nichttechnisch in % (z.B. 29.88)
-- overhead_gleich: true = T und NT Satz identisch (Toggle in UI)
-- workplan_locked: true = Arbeitsplan gesperrt/bewilligt

-- ------------------------------------------------------------
-- SCHRITT 2: Neue Tabelle v7_zahlungsanforderungen
-- Eine ZA pro Abrechnungszeitraum und Projekt
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS v7_zahlungsanforderungen (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id             UUID NOT NULL REFERENCES v7_projects(id) ON DELETE CASCADE,
  za_nummer              INTEGER NOT NULL,
  zeitraum_von           DATE NOT NULL,
  zeitraum_bis           DATE NOT NULL,

  -- Kostenarten Deckblatt (manuell einzutragen, nicht aus DB berechnet)
  auftraege_dritte_t     NUMERIC(12,2) DEFAULT 0,  -- Auftraege wiss.qual. Dritte technisch
  auftraege_dritte_nt    NUMERIC(12,2) DEFAULT 0,  -- Auftraege wiss.qual. Dritte nichttechnisch
  fue_unterauftrag       NUMERIC(12,2) DEFAULT 0,  -- FuE-Unterauftrag
  zeitw_personalaufnahme NUMERIC(12,2) DEFAULT 0,  -- Zeitweilige Personalaufnahme

  status                 TEXT DEFAULT 'entwurf',   -- entwurf / eingereicht / bewilligt
  notizen                TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),

  -- Jede ZA-Nummer nur einmal pro Projekt
  CONSTRAINT v7_za_projekt_nummer UNIQUE(project_id, za_nummer)
);

-- Index fuer schnellen Zugriff nach Projekt
CREATE INDEX IF NOT EXISTS idx_v7_za_project
  ON v7_zahlungsanforderungen(project_id);

-- Automatisches updated_at
CREATE TRIGGER v7_za_updated
  BEFORE UPDATE ON v7_zahlungsanforderungen
  FOR EACH ROW EXECUTE FUNCTION v7_update_timestamp();

-- RLS deaktivieren (wie alle anderen v7-Tabellen)
ALTER TABLE v7_zahlungsanforderungen DISABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- SCHRITT 3: Verification
-- Nach Ausfuehren pruefen ob alles korrekt angelegt wurde
-- ------------------------------------------------------------

-- Neue Spalten in v7_projects pruefen:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'v7_projects'
  AND column_name IN ('foerdersatz','overhead_t','overhead_nt','overhead_gleich','workplan_locked')
ORDER BY column_name;

-- Neue Tabelle pruefen:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'v7_zahlungsanforderungen'
ORDER BY ordinal_position;

-- ============================================================
-- ENDE MIGRATION v7.4.4
-- ============================================================
