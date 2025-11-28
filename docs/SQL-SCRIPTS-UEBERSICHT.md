# SQL Scripts Übersicht - Projektzeiterfassung v1.2

**Stand:** 28. November 2024

---

## 📋 Script-Reihenfolge für Neuinstallation

1. `01-basis-schema.sql` - Companies, User Profiles, Projects
2. `02-zeiterfassung-schema.sql` - Time Entries, Work Packages, Holidays
3. `03-safe-delete-functions.sql` - Soft Delete, Anonymisierung

---

## 1️⃣ Basis-Schema (bereits ausgeführt)

```sql
-- Companies
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  street TEXT NOT NULL,
  house_number TEXT NOT NULL,
  zip TEXT NOT NULL,
  city TEXT NOT NULL,
  state_code TEXT NOT NULL,
  country TEXT DEFAULT 'DE',
  legal_form TEXT,
  vat_id TEXT,
  email TEXT,
  website TEXT,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('company_admin', 'manager', 'employee')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  position TEXT,
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Projects
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  project_number TEXT,
  status TEXT DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2️⃣ Zeiterfassung-Schema (bereits ausgeführt)

```sql
-- Work Packages (Arbeitspakete)
CREATE TABLE work_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'project_work',
  estimated_hours NUMERIC,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, project_id, code)
);

-- Work Package Assignments (MA-Zuordnung)
CREATE TABLE work_package_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_package_id UUID REFERENCES work_packages(id) ON DELETE CASCADE NOT NULL,
  user_profile_id UUID REFERENCES user_profiles(id) ON DELETE RESTRICT NOT NULL,
  role TEXT,
  person_months NUMERIC,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(work_package_id, user_profile_id)
);

-- Time Entries (Zeiteinträge)
CREATE TABLE time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE RESTRICT,
  work_package_code TEXT,
  hours NUMERIC(5,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
  category TEXT DEFAULT 'project_work',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_profile_id, entry_date, project_id, work_package_code, category)
);

-- Public Holidays (Feiertage BW)
CREATE TABLE public_holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country TEXT DEFAULT 'DE',
  state_code TEXT,
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(country, state_code, holiday_date)
);

-- Feiertage BW 2024/2025
INSERT INTO public_holidays (country, state_code, holiday_date, name) VALUES
('DE', 'BW', '2024-01-01', 'Neujahr'),
('DE', 'BW', '2024-01-06', 'Heilige Drei Könige'),
('DE', 'BW', '2024-03-29', 'Karfreitag'),
('DE', 'BW', '2024-04-01', 'Ostermontag'),
('DE', 'BW', '2024-05-01', 'Tag der Arbeit'),
('DE', 'BW', '2024-05-09', 'Christi Himmelfahrt'),
('DE', 'BW', '2024-05-20', 'Pfingstmontag'),
('DE', 'BW', '2024-05-30', 'Fronleichnam'),
('DE', 'BW', '2024-10-03', 'Tag der Deutschen Einheit'),
('DE', 'BW', '2024-11-01', 'Allerheiligen'),
('DE', 'BW', '2024-12-25', '1. Weihnachtstag'),
('DE', 'BW', '2024-12-26', '2. Weihnachtstag'),
-- 2025
('DE', 'BW', '2025-01-01', 'Neujahr'),
('DE', 'BW', '2025-01-06', 'Heilige Drei Könige'),
('DE', 'BW', '2025-04-18', 'Karfreitag'),
('DE', 'BW', '2025-04-21', 'Ostermontag'),
('DE', 'BW', '2025-05-01', 'Tag der Arbeit'),
('DE', 'BW', '2025-05-29', 'Christi Himmelfahrt'),
('DE', 'BW', '2025-06-09', 'Pfingstmontag'),
('DE', 'BW', '2025-06-19', 'Fronleichnam'),
('DE', 'BW', '2025-10-03', 'Tag der Deutschen Einheit'),
('DE', 'BW', '2025-11-01', 'Allerheiligen'),
('DE', 'BW', '2025-12-25', '1. Weihnachtstag'),
('DE', 'BW', '2025-12-26', '2. Weihnachtstag')
ON CONFLICT DO NOTHING;

-- Indizes
CREATE INDEX idx_time_entries_user ON time_entries(user_profile_id);
CREATE INDEX idx_time_entries_date ON time_entries(entry_date);
CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_work_packages_project ON work_packages(project_id);
CREATE INDEX idx_work_packages_company ON work_packages(company_id);
```

---

## 3️⃣ Safe Delete Functions (bereits ausgeführt)

```sql
-- Soft Delete Felder
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Prüfen ob MA gelöscht werden kann
CREATE OR REPLACE FUNCTION can_delete_employee(employee_id UUID)
RETURNS TABLE (
  can_delete BOOLEAN,
  reason TEXT,
  active_projects INTEGER,
  total_assignments INTEGER
) AS $$
BEGIN
  -- Zähle aktive Zuordnungen
  SELECT COUNT(*) INTO total_assignments
  FROM work_package_assignments
  WHERE user_profile_id = employee_id;
  
  IF total_assignments > 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Mitarbeiter hat noch Arbeitspaket-Zuordnungen', 
      0::INTEGER, 
      total_assignments::INTEGER;
  ELSE
    RETURN QUERY SELECT 
      TRUE, 
      'Kann gelöscht werden', 
      0::INTEGER, 
      0::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Mitarbeiter anonymisieren (DSGVO)
CREATE OR REPLACE FUNCTION anonymize_employee(employee_id UUID, reason TEXT DEFAULT 'DSGVO')
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_profiles SET
    name = 'Ehemaliger Mitarbeiter #' || SUBSTRING(id::TEXT FROM 1 FOR 8),
    email = 'deleted_' || SUBSTRING(id::TEXT FROM 1 FOR 8) || '@anonymized.local',
    phone = NULL,
    position = NULL,
    department = NULL,
    deleted_at = NOW(),
    deletion_reason = reason,
    is_active = FALSE
  WHERE id = employee_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
```

---

## 4️⃣ Nützliche Queries

### Firmen anzeigen
```sql
SELECT id, name, city FROM companies ORDER BY name;
```

### Mitarbeiter einer Firma
```sql
SELECT up.name, up.email, up.role, up.is_active
FROM user_profiles up
WHERE up.company_id = 'COMPANY-ID'
ORDER BY up.name;
```

### Arbeitspakete eines Projekts
```sql
SELECT wp.code, wp.description, wp.estimated_hours,
       COUNT(wpa.id) as assigned_employees
FROM work_packages wp
LEFT JOIN work_package_assignments wpa ON wp.id = wpa.work_package_id
WHERE wp.project_id = 'PROJECT-ID'
GROUP BY wp.id
ORDER BY wp.code;
```

### Zeiteinträge eines Monats
```sql
SELECT te.entry_date, te.hours, te.work_package_code, up.name
FROM time_entries te
JOIN user_profiles up ON te.user_profile_id = up.id
WHERE EXTRACT(YEAR FROM te.entry_date) = 2024
  AND EXTRACT(MONTH FROM te.entry_date) = 11
ORDER BY te.entry_date, up.name;
```

### Monats-Summen pro Mitarbeiter
```sql
SELECT up.name, 
       SUM(te.hours) as total_hours,
       COUNT(DISTINCT te.entry_date) as days_worked
FROM time_entries te
JOIN user_profiles up ON te.user_profile_id = up.id
WHERE EXTRACT(YEAR FROM te.entry_date) = 2024
  AND EXTRACT(MONTH FROM te.entry_date) = 11
GROUP BY up.id, up.name
ORDER BY up.name;
```

---

## 5️⃣ Projekt-Transfer (Beispiel VETIS)

```sql
-- Projekt zu anderer Firma verschieben
UPDATE projects 
SET company_id = 'NEUE-COMPANY-ID'
WHERE id = 'PROJECT-ID';

-- Arbeitspakete auch verschieben
UPDATE work_packages 
SET company_id = 'NEUE-COMPANY-ID'
WHERE project_id = 'PROJECT-ID';

-- Alte MA-Zuordnungen löschen
DELETE FROM work_package_assignments 
WHERE work_package_id IN (
  SELECT id FROM work_packages WHERE project_id = 'PROJECT-ID'
);
```

---

## 6️⃣ RLS Policies (für Production)

```sql
-- ⚠️ Aktuell DEAKTIVIERT für Entwicklung!
-- Vor Production aktivieren:

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_package_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Beispiel Policy: User sieht nur eigene Firma
CREATE POLICY "Users see own company" ON companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Weitere Policies nach Bedarf...
```

---

**Ende der SQL-Übersicht**
