# Pflichtenheft - Projektzeiterfassung v4.0

**Version:** 4.0  
**Datum:** 30. Dezember 2024  
**Status:** V7-Entwicklung aktiv

---

## 1. Projektuebersicht

### 1.1 Zweck
Webbasierte Zeiterfassung fuer gefoerderte F&E-Projekte (ZIM, BMBF/KMU-innovativ) mit:
- Mitarbeiter-Zeiterfassung
- Projekt- und Arbeitspaket-Verwaltung
- BMF-konforme Berichte (FZul, ZIM)
- **Analyse-Modul fuer externe Stundennachweise**
- **FZul Online-Editor mit Multi-Projekt-Konsolidierung**
- **NEU v7.0: Berater-Portal mit Firmen-Hierarchie**

### 1.2 Technologie-Stack
- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Deployment:** Vercel (Production + v7-dev Preview)
- **Package Manager:** pnpm
- **PDF-Generierung:** pdf-lib
- **Excel-Verarbeitung:** xlsx, xlsx-populate
- **PDF-Parsing:** pdf-parse (NEU fuer ZIM-Antrag-Import)

---

## 2. Versionsstruktur

### 2.1 Aktive Branches

| Branch | Version | URL | Status |
|--------|---------|-----|--------|
| `main` | v6.7.16-stable | projektzeiterfassung20.vercel.app | Produktion |
| `v7-dev` | v7.0.x | projektzeiterfassung20-v7-dev.vercel.app | Entwicklung |

### 2.2 Parallele Systeme

**V6 (Produktion):**
- FZul-Editor fuer Stundennachweise
- Excel-Import (ZIM, BMBF)
- PDF/Excel-Export
- Archiv-Funktion

**V7 (Entwicklung):**
- Berater-Portal mit Firmen-Hierarchie
- ZIM-Projektantrag PDF-Import
- Neue Tabellenstruktur (v7_*)
- Client-Company-Verwaltung

---

## 3. V7 Berater-Portal

### 3.1 Konzept

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      BERATER-PORTAL V7                                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Berater-Firma (consultant_company)                              │   │
│  │  z.B. "MD Business Services"                                     │   │
│  │                                                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ Client 1    │  │ Client 2    │  │ Client 3    │              │   │
│  │  │ Tippl GmbH  │  │ ASsystem    │  │ Stoma GmbH  │              │   │
│  │  │             │  │             │  │             │              │   │
│  │  │ - Projekte  │  │ - Projekte  │  │ - Projekte  │              │   │
│  │  │ - MA        │  │ - MA        │  │ - MA        │              │   │
│  │  │ - Timesheets│  │ - Timesheets│  │ - Timesheets│              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Datenbank-Schema V7

#### v7_consultant_companies (Berater-Firmen)
```sql
CREATE TABLE v7_consultant_companies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  -- Adressdaten...
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### v7_client_companies (Kunden-Firmen)
```sql
CREATE TABLE v7_client_companies (
  id UUID PRIMARY KEY,
  consultant_company_id UUID REFERENCES v7_consultant_companies(id),
  name TEXT NOT NULL,
  short_name TEXT,
  street TEXT,
  zip_code TEXT,
  city TEXT,
  federal_state TEXT,  -- DE-BW, DE-NW, etc.
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(consultant_company_id, name)
);
```

#### v7_projects (Projekte)
```sql
CREATE TABLE v7_projects (
  id UUID PRIMARY KEY,
  client_company_id UUID REFERENCES v7_client_companies(id),
  name TEXT NOT NULL,
  short_name TEXT,
  funding_reference TEXT,  -- FKZ
  funding_format TEXT,     -- 'ZIM', 'BMBF_KMU', 'FZUL'
  start_date DATE,
  end_date DATE,
  fzul_vorhaben_title TEXT,
  fzul_vorhaben_id TEXT,
  source_filename TEXT,
  imported_at TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### v7_employees (Mitarbeiter)
```sql
CREATE TABLE v7_employees (
  id UUID PRIMARY KEY,
  client_company_id UUID REFERENCES v7_client_companies(id),
  display_name TEXT NOT NULL,  -- "Nachname, Vorname"
  first_name TEXT,
  last_name TEXT,
  name TEXT,                   -- "Vorname Nachname"
  email TEXT,
  qualification TEXT,
  position_title TEXT,
  position TEXT,
  employment_start DATE,
  employment_end DATE,
  entry_date DATE,
  exit_date DATE,
  weekly_hours NUMERIC(4,1) DEFAULT 40,
  annual_leave_days INTEGER DEFAULT 30,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(client_company_id, display_name)
);
```

#### v7_project_assignments (MA-Projekt-Zuordnungen)
```sql
CREATE TABLE v7_project_assignments (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES v7_projects(id),
  employee_id UUID REFERENCES v7_employees(id),
  role_in_project TEXT,
  fue_percentage NUMERIC(5,2) DEFAULT 100.00,
  assignment_start DATE,
  assignment_end DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(project_id, employee_id)
);
```

#### v7_user_profiles (Benutzer-Profile)
```sql
CREATE TABLE v7_user_profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  role TEXT,  -- 'system_admin', 'consultant', 'client_user'
  consultant_company_id UUID REFERENCES v7_consultant_companies(id),
  client_company_id UUID REFERENCES v7_client_companies(id),
  is_active BOOLEAN DEFAULT true,
  invited_by UUID,
  invited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### 3.3 ZIM-Projektantrag PDF-Import

**Neue Funktion:** Import von ausgefuellten ZIM-Foerderantraegen (PDF)

**Extrahierte Daten:**
- Projektdaten (Name, FKZ, Laufzeit, Foerderquote, Budget)
- Antragsteller (Firma, Adresse, Ansprechpartner)
- Mitarbeiter aus Anlage 6.1/6.2 (Name, Qualifikation, Stundensatz, PM)
- Arbeitspakete (optional)

**Workflow:**
1. PDF hochladen
2. Server-seitiges Parsing (/api/parse-zim)
3. Vorschau der extrahierten Daten
4. Import in Datenbank (Firma, Projekt, Mitarbeiter, Zuordnungen)

**Unterstuetzte Formate:**
- ZIM Einzelprojekt
- ZIM Kooperationsprojekt
- ZIM Durchfuehrbarkeitsstudie
- ZIM Innovationsnetzwerk

### 3.4 Datums-Konvertierung

Deutsches Datumsformat wird automatisch konvertiert:
```typescript
// DD.MM.YYYY -> YYYY-MM-DD
parseGermanDate('01.07.2005') // -> '2005-07-01'
```

---

## 4. V6 FZul Online-Editor (Produktion)

### 4.1 Workflow

1. **Mitarbeiter + Jahr auswaehlen**
2. **FZul-Vorhaben-Daten eingeben** (Modal, einmalig pro Firma)
3. **Daten laden** - aggregiert alle Projekte des MA
4. **Bearbeiten** - Tageswerte anpassen, Abwesenheiten eintragen
5. **Export** - Excel oder PDF generieren

### 4.2 Tastatursteuerung

| Taste | Funktion |
|-------|----------|
| Tab | Naechste Zelle rechts |
| Enter | Gleicher Tag im naechsten Monat |
| Pfeiltasten | Navigation |
| Delete | Zellwert auf 0 setzen |
| Escape | Bearbeitung abbrechen |

### 4.3 Abwesenheits-Kuerzel

| Eingabe | Bedeutung | Farbe |
|---------|-----------|-------|
| U, UR, URLAUB | Urlaub | Blau |
| K, KR, KRANK | Krankheit | Orange |
| S, A, AB | Sonderurlaub/Abwesend | Grau |

---

## 5. Deployment

### 5.1 Vercel-Konfiguration

**Production (main):**
- URL: projektzeiterfassung20.vercel.app
- Automatisches Deployment bei Push auf main

**Preview (v7-dev):**
- URL: projektzeiterfassung20-v7-dev.vercel.app
- Automatisches Deployment bei Push auf v7-dev

### 5.2 Git-Workflow

```bash
# V7-Entwicklung
git checkout v7-dev
# ... Aenderungen ...
git add .
git commit -m "v7.x.x: Beschreibung"
git push origin v7-dev

# Nach stabilem Feature -> main mergen
git checkout main
git merge v7-dev
git push origin main
git tag -a vX.X.X-stable -m "Beschreibung"
git push origin vX.X.X-stable
```

---

## 6. RLS (Row Level Security)

### 6.1 V7-Tabellen (Entwicklung - RLS deaktiviert)

```sql
ALTER TABLE v7_user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_client_companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_project_assignments DISABLE ROW LEVEL SECURITY;
```

**Hinweis:** Fuer Produktion muessen RLS-Policies aktiviert werden!

---

## 7. Versions-Historie

| Version | Datum | Hauptaenderungen |
|---------|-------|------------------|
| v7.0.1 | 30.12.2024 | ZIM-PDF-Import funktioniert, Datums-Fix |
| v7.0.0 | 27.12.2024 | Berater-Portal Grundstruktur, V7-Tabellen |
| v6.7.16 | 20.12.2024 | FZul-Vorhaben persistent, Excel-Header-Fix |
| v6.7.12 | 20.12.2024 | Bugfix: Verfuegbare Stunden bei U/K |
| v6.6.2 | 16.12.2024 | Option A (verfuegbare Stunden), Feiertags-Fix |
| v6.6.1 | 15.12.2024 | BMBF-Parser erweitert |
| v6.6 | 14.12.2024 | ZIM-Parser, Multi-Format-Import |
| v6.5 | 12.12.2024 | FZul-Editor Grundversion |

---

## 8. Bekannte Einschraenkungen

### V7 (Entwicklung)
1. RLS deaktiviert - nur fuer Entwicklung geeignet
2. Nur PDF-Import implementiert (kein Excel-Import in V7)
3. Timesheet-Erfassung noch nicht implementiert
4. FZul-Editor noch nicht portiert

### V6 (Produktion)
1. MA-Stammdaten nicht firmen-spezifisch
2. Keine Firmen-Hierarchie
3. Nur eine FZul-Vorhaben pro Firma

---

## 9. Geplante Erweiterungen

### V7 Phase 1 (aktuell)
- [x] Datenbank-Schema v7_*
- [x] Berater-Portal Grundstruktur
- [x] ZIM-PDF-Import
- [ ] Excel-Import portieren
- [ ] Timesheet-Erfassung

### V7 Phase 2 (geplant)
- [ ] FZul-Editor in V7 integrieren
- [ ] DSGVO-konforme Autorisierung
- [ ] Firmen-eigener Zugang

### Allgemein
- [ ] Phase 6: Zahlungsanforderungen
- [ ] Mehrere FZul-Vorhaben pro Firma

---

## 10. Dateien V7

### 10.1 Hauptdateien

```
src/app/v7/
├── page.tsx                    # Firmen-Uebersicht
├── import/
│   └── page.tsx               # Import-Seite (PDF, Excel, Manuell)
└── api/
    └── parse-zim/
        └── route.ts           # ZIM-PDF-Parser API
```

### 10.2 Projektdokumentation

```
Projektwurzel/
├── PFLICHTENHEFT-v4_0.md       # Diese Datei
├── GIT-SICHERUNG-v7_0_1.md     # Aktuelle Commit-Anleitung
├── KONZEPT-FIRMEN-HIERARCHIE-v7_1.md
├── page-v7-import-FINAL-v2.tsx # Aktuelle Import-Seite
└── route-fixed.ts              # API-Route fuer PDF-Parser
```

---

**Erstellt:** 30. Dezember 2024  
**Autor:** Claude AI / Martin Ditscherlein
