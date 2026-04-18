-- ============================================
-- V7 MIGRATION: Stundensatz in Projektzuordnung
-- VERSION: v7.3.20
-- DATUM: 20. Januar 2026
-- ============================================

-- Der Stundensatz gehört zur Projektzuordnung, nicht zum Mitarbeiter!
-- Grund: Der Stundensatz wird bei Antragstellung pro Projekt berechnet
-- und bleibt für die gesamte Projektlaufzeit fix.
-- Ein Mitarbeiter kann in verschiedenen Projekten unterschiedliche
-- Stundensätze haben.

-- ============================================
-- 1. Spalte hourly_rate zu v7_project_assignments hinzufügen
-- ============================================

ALTER TABLE v7_project_assignments 
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(8,2);

COMMENT ON COLUMN v7_project_assignments.hourly_rate 
IS 'Stundensatz lt. Antrag (€/h), fix für gesamte Projektlaufzeit. Berechnet aus Jahresgehalt bei Antragstellung.';

-- ============================================
-- 2. Optional: Index für Abfragen nach Stundensatz
-- ============================================

-- CREATE INDEX idx_v7_assignments_hourly_rate ON v7_project_assignments(hourly_rate);

-- ============================================
-- ENDE MIGRATION
-- ============================================
