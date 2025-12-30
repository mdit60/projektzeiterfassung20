# KONZEPT: Firmen-Hierarchie für Import-Modul v7.1

**Projektzeiterfassung20**  
**Version:** 7.1 (Aktualisiert nach Besprechung)  
**Datum:** 19.12.2024  
**Status:** KONZEPT - Bereit zur Implementierung  
**Basis:** KONZEPT-FIRMEN-HIERARCHIE-v7_0.md

---

## 1. Gesamtvision

### 1.1 Zwei Anwendergruppen

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GESAMTSYSTEM                                     │
│                                                                         │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────┐│
│  │  🅰️ FIRMEN                   │    │  🅱️ BERATER                      ││
│  │  (FuE-Projekte)             │    │  (Beratung & Analyse)           ││
│  │                             │    │                                 ││
│  │  • Eigene Zeiterfassung     │    │  • Zugriff auf Kundenfirmen     ││
│  │  • Eigene Projekte          │    │  • Projektförderung-Beratung    ││
│  │  • Eigene MA                │    │  • Forschungszulage-Beratung    ││
│  │  • Eigene Berichte          │    │  • FZul-Analyse (getrennt!)     ││
│  └─────────────────────────────┘    └─────────────────────────────────┘│
│                                                                         │
│                    ↓ Autorisierung durch GF ↓                          │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  DSGVO-konforme Verbindung (Phase 2 - später)                       ││
│  │  • Berater muss von Firma autorisiert werden                        ││
│  │  • GF erteilt Berechtigung                                          ││
│  │  • Audit-Trail für Zugriffe                                         ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Beziehungsdiagramm (aus Besprechung)

```
┌──────────┐         ┌─────────────────┐
│          │────────▶│ Beratung        │
│ Berater  │         │ Projekt-        │
│          │         │ Förderung       │◀──────────────┐
└────┬─────┘         └────────┬────────┘               │
     │                        │                        │
     │                        ▼                        │
     │               ┌─────────────────┐     ┌────────┴────────┐
     │               │                 │     │ Beratung        │
     │               │    Projekte     │◀────│ Forschungs-     │
     │               │                 │     │ zulage          │
     │               └────────┬────────┘     └─────────────────┘
     │                        │
     ▼                        │
┌──────────┐                  │
│          │──────────────────┘
│  Firmen  │
│          │
└────┬─────┘
     │
     ▼
┌──────────┐
│          │
│Mitarbeiter│
│          │
└──────────┘
```

---

## 2. Implementierungs-Phasen

### Phase 1: Strikte Firmentrennung (PRIORITÄT - v7.0)

**Ziel:** Separate Analyse mehrerer Projekte EINER Firma

**Problem aktuell:**
- Alle MA-Stammdaten unter Berater-company_id
- FZul-Editor zeigt MA aller importierten Firmen vermischt
- Keine Trennung zwischen Tippl und Stoma möglich

**Lösung:**
- Neue Tabelle `import_companies` (Kundenfirmen)
- MA-Stammdaten pro Firma (`import_employees`)
- Projekte pro Firma (`import_projects`)
- FZul-Editor filtert strikt nach gewählter Firma

### Phase 2: DSGVO-konforme Autorisierung (später)

**Ziel:** Berater-Zugriff durch Firmenchef autorisieren

- Einladungssystem (Berater → Firma)
- Bestätigung durch GF erforderlich
- Audit-Trail für alle Zugriffe
- Widerruf der Berechtigung möglich
- Datenschutz-Dokumentation

---

## 3. Entwicklungs-Setup

### 3.1 Git-Branch-Strategie (ENTSCHEIDUNG)

**Gewählt: Option A - Git-Branch**

```bash
# Aktuellen Stand sichern
git checkout main
git tag -a v6.7.11-stable -m "Letzte stabile v6.x Version"
git push origin v6.7.11-stable

# Neuen Branch für v7 erstellen
git checkout -b v7-firmen-hierarchie

# Entwicklung in v7-Branch
# main bleibt auf v6.7.11 für Produktiv-Nutzung

# Bei Bedarf zwischen Versionen wechseln:
git checkout main           # → v6.7.11 (stabil)
git checkout v7-firmen-hierarchie  # → v7.0 (Entwicklung)
```

**Vorteile:**
- v6.7.11 bleibt für aktuelle Analysen nutzbar
- Unabhängige Entwicklung von v7.0
- Einfacher Wechsel zwischen Versionen
- Späteres Mergen möglich

### 3.2 Vercel Deployment

```
main Branch          → projektzeiterfassung20.vercel.app (Produktion)
v7-firmen-hierarchie → projektzeiterfassung20-v7.vercel.app (Preview)
```

---

## 4. Datenbank-Schema v7.0

### 4.1 Neue Tabellen

#### import_companies (Kundenfirmen des Beraters)

```sql
CREATE TABLE import_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Zugehörigkeit zum Berater
    berater_company_id UUID NOT NULL REFERENCES companies(id),
    
    -- Firmendaten
    name TEXT NOT NULL,
    short_name TEXT,                    -- Kurzname für Anzeige
    federal_state TEXT NOT NULL,        -- Bundesland (DE-BW, DE-NW, etc.)
    
    -- Optionale Zusatzdaten
    street TEXT,
    zip_code TEXT,
    city TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Eindeutigkeit: Pro Berater nur eine Firma mit diesem Namen
    UNIQUE(berater_company_id, name)
);

CREATE INDEX idx_import_companies_berater ON import_companies(berater_company_id);
```

#### import_employees (MA-Stammdaten pro Firma)

```sql
CREATE TABLE import_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Zugehörigkeit zur FIRMA (nicht mehr zum Berater!)
    import_company_id UUID NOT NULL REFERENCES import_companies(id) ON DELETE CASCADE,
    
    -- MA-Daten
    employee_name TEXT NOT NULL,        -- "Nachname, Vorname" Format
    first_name TEXT,
    last_name TEXT,
    
    -- Arbeitszeit-Stammdaten
    weekly_hours NUMERIC(4,1) DEFAULT 40.0,
    annual_leave_days INTEGER DEFAULT 30,
    
    -- Position/Qualifikation
    position_title TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Notizen
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Eindeutigkeit: Pro Firma nur ein MA mit diesem Namen
    UNIQUE(import_company_id, employee_name)
);

CREATE INDEX idx_import_employees_company ON import_employees(import_company_id);
```

#### import_projects (Projekte pro Firma)

```sql
CREATE TABLE import_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Zugehörigkeit
    import_company_id UUID NOT NULL REFERENCES import_companies(id) ON DELETE CASCADE,
    
    -- Projektdaten
    name TEXT NOT NULL,                 -- Voller Projektname
    short_name TEXT,                    -- Kurzname
    funding_reference TEXT NOT NULL,    -- FKZ (16KN087520, 01LY1925A, etc.)
    funding_format TEXT NOT NULL,       -- 'ZIM', 'BMBF_KMU', 'FZUL', etc.
    
    -- Laufzeit
    start_year INTEGER,
    end_year INTEGER,
    
    -- Original-Import-Info
    original_filename TEXT,
    
    -- Status
    status TEXT DEFAULT 'active',       -- active, completed, archived
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Eindeutigkeit: Pro Firma nur ein Projekt mit diesem FKZ
    UNIQUE(import_company_id, funding_reference)
);

CREATE INDEX idx_import_projects_company ON import_projects(import_company_id);
CREATE INDEX idx_import_projects_fkz ON import_projects(funding_reference);
```

#### project_employee_assignments (MA-Projekt-Zuordnung)

```sql
CREATE TABLE project_employee_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Verknüpfung
    project_id UUID NOT NULL REFERENCES import_projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES import_employees(id) ON DELETE CASCADE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Eindeutigkeit
    UNIQUE(project_id, employee_id)
);

CREATE INDEX idx_pea_project ON project_employee_assignments(project_id);
CREATE INDEX idx_pea_employee ON project_employee_assignments(employee_id);
```

### 4.2 Anpassung bestehender Tabellen

#### imported_timesheets - Erweiterung

```sql
-- Neue Spalten hinzufügen
ALTER TABLE imported_timesheets 
ADD COLUMN import_company_id UUID REFERENCES import_companies(id),
ADD COLUMN import_project_id UUID REFERENCES import_projects(id),
ADD COLUMN import_employee_id UUID REFERENCES import_employees(id);

-- Index für Firma-Filterung
CREATE INDEX idx_timesheets_import_company ON imported_timesheets(import_company_id);
```

#### fzul_pdf_archive - Erweiterung

```sql
ALTER TABLE fzul_pdf_archive 
ADD COLUMN import_company_id UUID REFERENCES import_companies(id);
```

#### fzul_excel_archive - Erweiterung

```sql
ALTER TABLE fzul_excel_archive 
ADD COLUMN import_company_id UUID REFERENCES import_companies(id);
```

### 4.3 RLS Policies

```sql
-- Alle neuen Tabellen: Berater sieht nur seine Kundenfirmen
ALTER TABLE import_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_employee_assignments ENABLE ROW LEVEL SECURITY;

-- import_companies
CREATE POLICY "Berater sieht seine Firmen" ON import_companies
    FOR ALL USING (
        berater_company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

-- import_projects (über Firma)
CREATE POLICY "Berater sieht Projekte seiner Firmen" ON import_projects
    FOR ALL USING (
        import_company_id IN (
            SELECT id FROM import_companies WHERE berater_company_id IN (
                SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
            )
        )
    );

-- import_employees (über Firma)
CREATE POLICY "Berater sieht MA seiner Firmen" ON import_employees
    FOR ALL USING (
        import_company_id IN (
            SELECT id FROM import_companies WHERE berater_company_id IN (
                SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
            )
        )
    );

-- project_employee_assignments (über Projekt)
CREATE POLICY "Berater sieht Zuordnungen seiner Projekte" ON project_employee_assignments
    FOR ALL USING (
        project_id IN (
            SELECT id FROM import_projects WHERE import_company_id IN (
                SELECT id FROM import_companies WHERE berater_company_id IN (
                    SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
                )
            )
        )
    );
```

---

## 5. Import-Workflow (ENTSCHEIDUNG)

### 5.1 Ablauf beim Excel-Import

```
┌─────────────────────────────────────┐
│         Excel hochladen             │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│    Format erkennen (ZIM/BMBF)       │
│    Metadaten extrahieren:           │
│    • Firmenname (wenn vorhanden)    │
│    • FKZ                            │
│    • Projektname                    │
│    • MA-Namen                       │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Firma zuordnen                                      │   │
│  │                                                      │   │
│  │  Erkannt: "Tippl" (aus Excel)                       │   │
│  │                                                      │   │
│  │  ○ Vorhandene Firma auswählen:                      │   │
│  │    ┌────────────────────────────────────────┐       │   │
│  │    │ Tippl GmbH (Baden-Württemberg)      ▼ │       │   │
│  │    └────────────────────────────────────────┘       │   │
│  │                                                      │   │
│  │  ○ Neue Firma anlegen:                              │   │
│  │    Firmenname: [________________________]           │   │
│  │    Bundesland: [Baden-Württemberg      ▼]           │   │
│  │                                                      │   │
│  │                          [Abbrechen] [Weiter →]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────┐
│  MA der Firma zuordnen/anlegen      │
│  Projekt der Firma zuordnen         │
│  Timesheets importieren             │
└─────────────────────────────────────┘
```

### 5.2 Firmen-Erkennung aus Excel

| Format | Erkennungsfeld | Beispiel |
|--------|----------------|----------|
| ZIM | Worksheet-Name oder Header | "Tippl" |
| BMBF | Header-Zeile | "Stoma GmbH" |
| FZul | Zelle mit Firmenname | Variable |

Bei nicht erkennbarem Firmennamen: Manuelle Eingabe erforderlich.

---

## 6. UI-Änderungen

### 6.1 Tab-Struktur (neu)

**Ebene 1: Firmenübersicht**

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 Analyse - Stundennachweise                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🏢 Firmen  2      ➕ Import      🔐 Berechtigungen                │
│  ═══════════════════════════════════════════════════════════        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🏢 Tippl GmbH                                         7399h │   │
│  │    Baden-Württemberg • 5 MA • 2 Projekte                    │   │
│  │    📁 Flexitrace, KI-EasyMould                    [Öffnen]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🏢 Stoma GmbH                                         9508h │   │
│  │    Nordrhein-Westfalen • 5 MA • 1 Projekt                   │   │
│  │    📁 KMU-innovativ                               [Öffnen]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│  │  ➕ Neue Firma anlegen                                      │   │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
└─────────────────────────────────────────────────────────────────────┘
```

**Ebene 2: Firmen-Detail (nach Klick auf "Öffnen")**

```
┌─────────────────────────────────────────────────────────────────────┐
│  🏢 FIRMA: Tippl GmbH                        [← Zurück zu Firmen]  │
│  Baden-Württemberg                                    [✏️ Bearbeiten]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📁 Projekte  2   👥 MA-Stammdaten   📝 FZul Editor   📁 Archiv   │
│  ═══════════════════════════════════════════════════════════════    │
│                                                                     │
│  (Bisherige Tabs, aber NUR Daten dieser Firma!)                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 FZul-Editor Anpassung

**Wichtigste Änderung:** 
- MA-Dropdown zeigt NUR MA der ausgewählten Firma
- Kapazitätsberechnung nur über Projekte dieser Firma
- Keine Vermischung mehr möglich!

---

## 7. Sessions-Plan

### Session 1: Grundgerüst
- [ ] Git-Branch `v7-firmen-hierarchie` erstellen
- [ ] SQL-Tabellen in Supabase erstellen
- [ ] Basis-Interfaces im Code anlegen
- [ ] Firmen-Tab (Übersicht) implementieren

### Session 2: Firmen-CRUD
- [ ] Firma anlegen Modal
- [ ] Firma bearbeiten
- [ ] Firma löschen (mit Abhängigkeiten)
- [ ] Firmen-Detail-Ansicht

### Session 3: Import-Workflow
- [ ] Firma-Auswahl beim Import
- [ ] Firmen-Erkennung aus Excel
- [ ] Neue Firma während Import anlegen
- [ ] MA/Projekte der Firma zuordnen

### Session 4: Filterung
- [ ] Projekte-Tab nach Firma filtern
- [ ] MA-Stammdaten nach Firma filtern
- [ ] FZul-Editor nach Firma filtern
- [ ] Archiv nach Firma filtern

### Session 5: Migration & Test
- [ ] Bestehende Daten migrieren (optional)
- [ ] End-to-End Tests
- [ ] Bug-Fixes
- [ ] Dokumentation

---

## 8. Migration bestehender Daten

### 8.1 Option A: Frisch starten (empfohlen für Phase 1)

```sql
-- Alte Import-Daten löschen
DELETE FROM imported_timesheets WHERE company_id = '[berater_company_id]';
DELETE FROM fzul_employee_settings WHERE company_id = '[berater_company_id]';
DELETE FROM fzul_pdf_archive WHERE company_id = '[berater_company_id]';
DELETE FROM fzul_excel_archive WHERE company_id = '[berater_company_id]';
```

Dann: Neu importieren mit Firma-Zuordnung.

### 8.2 Option B: Migration

```sql
-- 1. Firmen aus vorhandenen Projektnamen ableiten
INSERT INTO import_companies (berater_company_id, name, federal_state)
SELECT DISTINCT 
    company_id,
    CASE 
        WHEN project_name LIKE '%Flexitrace%' THEN 'Tippl GmbH'
        WHEN project_name LIKE '%KMU-innovativ%' THEN 'Stoma GmbH'
        ELSE 'Unbekannt'
    END,
    'DE-BW'  -- Manuell anpassen
FROM imported_timesheets
WHERE company_id = '[berater_company_id]';

-- 2. MA den Firmen zuordnen (manuell nacharbeiten)
-- 3. Timesheets aktualisieren
```

**Empfehlung:** Option A (frisch starten) ist sauberer und weniger fehleranfällig.

---

## 9. Offene Punkte (für später)

### DSGVO (Phase 2)
- [ ] Einladungssystem für Berater → Firma
- [ ] Bestätigung durch Geschäftsführer
- [ ] Audit-Trail für Zugriffe
- [ ] Widerruf der Berechtigung
- [ ] Datenexport für Firmen
- [ ] Löschkonzept

### Firmen-eigener Zugang (Phase 3)
- [ ] Firmen können sich selbst registrieren
- [ ] Eigene Zeiterfassung
- [ ] Eigene Berichte
- [ ] Berater einladen

---

**Dokument erstellt:** 19.12.2024  
**Basis:** Besprechung + KONZEPT-FIRMEN-HIERARCHIE-v7_0.md  
**Nächster Schritt:** Session 1 - Git-Branch + SQL-Tabellen
