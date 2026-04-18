-- ============================================================================
-- PZE V7.3.77 - MIGRATION: Arbeitspakete 4 Hierarchie-Ebenen
-- ============================================================================
-- Datum: 23. Januar 2026
-- 
-- AENDERUNGEN:
-- 1. ap_sub_sub_number (INTEGER) - Dritte Ebene (z.B. AP1.2.3)
-- 2. ap_level_4 (INTEGER) - Vierte Ebene als Reserve (z.B. AP1.2.3.1)
-- 3. Unique Constraint aktualisieren
--
-- BEISPIELE:
-- AP1           -> ap_number=1, ap_sub_number=NULL, ap_sub_sub_number=NULL, ap_level_4=NULL
-- AP1.2         -> ap_number=1, ap_sub_number=2,    ap_sub_sub_number=NULL, ap_level_4=NULL
-- AP1.2.3       -> ap_number=1, ap_sub_number=2,    ap_sub_sub_number=3,    ap_level_4=NULL
-- AP1.2.3.1     -> ap_number=1, ap_sub_number=2,    ap_sub_sub_number=3,    ap_level_4=1
--
-- UEBERSCHRIFTEN vs ECHTE APs:
-- Ueberschrift  -> total_person_months IS NULL oder = 0
-- Echtes AP    -> total_person_months > 0 (Mitarbeiter-Zuordnung moeglich)
-- ============================================================================

-- ============================================================================
-- SCHRITT 1: Neue Spalten hinzufuegen
-- ============================================================================

-- ap_sub_sub_number (Ebene 3)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'v7_work_packages' 
        AND column_name = 'ap_sub_sub_number'
    ) THEN
        ALTER TABLE v7_work_packages 
        ADD COLUMN ap_sub_sub_number INTEGER DEFAULT NULL;
        
        COMMENT ON COLUMN v7_work_packages.ap_sub_sub_number IS 
            'Dritte Ebene der AP-Nummer (z.B. 3 fuer AP1.2.3)';
    END IF;
END $$;

-- ap_level_4 (Ebene 4 - Reserve)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'v7_work_packages' 
        AND column_name = 'ap_level_4'
    ) THEN
        ALTER TABLE v7_work_packages 
        ADD COLUMN ap_level_4 INTEGER DEFAULT NULL;
        
        COMMENT ON COLUMN v7_work_packages.ap_level_4 IS 
            'Vierte Ebene der AP-Nummer als Reserve (z.B. 1 fuer AP1.2.3.1)';
    END IF;
END $$;

-- ============================================================================
-- SCHRITT 2: Unique Constraint aktualisieren
-- ============================================================================

-- Alten Constraint loeschen (falls vorhanden)
DO $$
BEGIN
    -- Versuche verschiedene Constraint-Namen
    BEGIN
        ALTER TABLE v7_work_packages DROP CONSTRAINT IF EXISTS v7_work_packages_project_id_ap_number_key;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE v7_work_packages DROP CONSTRAINT IF EXISTS v7_work_packages_project_ap_unique;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE v7_work_packages DROP CONSTRAINT IF EXISTS unique_project_ap;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

-- Neuen Constraint mit allen 4 Ebenen erstellen
ALTER TABLE v7_work_packages 
ADD CONSTRAINT v7_work_packages_project_ap_unique 
UNIQUE (project_id, ap_number, ap_sub_number, ap_sub_sub_number, ap_level_4);

-- ============================================================================
-- SCHRITT 3: Index fuer Sortierung
-- ============================================================================

-- Index fuer effiziente Sortierung nach AP-Hierarchie
DROP INDEX IF EXISTS idx_work_packages_ap_hierarchy;
CREATE INDEX idx_work_packages_ap_hierarchy 
ON v7_work_packages (
    project_id, 
    ap_number, 
    COALESCE(ap_sub_number, 0), 
    COALESCE(ap_sub_sub_number, 0),
    COALESCE(ap_level_4, 0)
);

-- ============================================================================
-- SCHRITT 4: Hilfsfunktion fuer AP-Code Generierung
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_ap_code(
    p_ap_number INTEGER,
    p_ap_sub_number INTEGER DEFAULT NULL,
    p_ap_sub_sub_number INTEGER DEFAULT NULL,
    p_ap_level_4 INTEGER DEFAULT NULL
) RETURNS TEXT AS $$
BEGIN
    IF p_ap_level_4 IS NOT NULL THEN
        RETURN 'AP' || p_ap_number || '.' || p_ap_sub_number || '.' || p_ap_sub_sub_number || '.' || p_ap_level_4;
    ELSIF p_ap_sub_sub_number IS NOT NULL THEN
        RETURN 'AP' || p_ap_number || '.' || p_ap_sub_number || '.' || p_ap_sub_sub_number;
    ELSIF p_ap_sub_number IS NOT NULL THEN
        RETURN 'AP' || p_ap_number || '.' || p_ap_sub_number;
    ELSE
        RETURN 'AP' || p_ap_number;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- SCHRITT 5: Verify
-- ============================================================================

-- Pruefe ob alle Spalten existieren
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'v7_work_packages' 
    AND column_name IN ('ap_number', 'ap_sub_number', 'ap_sub_sub_number', 'ap_level_4');
    
    IF col_count = 4 THEN
        RAISE NOTICE 'Migration erfolgreich: Alle 4 AP-Ebenen vorhanden';
    ELSE
        RAISE WARNING 'Migration unvollstaendig: Nur % von 4 Spalten gefunden', col_count;
    END IF;
END $$;

-- ============================================================================
-- ENDE MIGRATION
-- ============================================================================
