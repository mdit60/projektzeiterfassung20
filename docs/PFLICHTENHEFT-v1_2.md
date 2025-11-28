# Projektzeiterfassung - Pflichtenheft & Dokumentation
**Stand:** 28. November 2024
**Version:** 1.2 - Zeiterfassung & Projektverwaltung Erweitert
**Git Tag:** v1.2

---

## 📋 Inhaltsverzeichnis

1. [Projektübersicht](#projektübersicht)
2. [Technologie-Stack](#technologie-stack)
3. [Datenbank-Schema](#datenbank-schema)
4. [Implementierte Features](#implementierte-features)
5. [Dateistruktur](#dateistruktur)
6. [API-Endpunkte](#api-endpunkte)
7. [Authentifizierung & Autorisierung](#authentifizierung--autorisierung)
8. [Benutzerrollen](#benutzerrollen)
9. [User Journey](#user-journey)
10. [Offene Punkte / Todo](#offene-punkte--todo)
11. [Installation & Setup](#installation--setup)
12. [Bekannte Probleme](#bekannte-probleme)
13. [Changelog](#changelog)

---

## 🎯 Projektübersicht

### Zweck
Web-Anwendung zur Zeiterfassung für kleine und mittelständische Unternehmen. Ermöglicht Firmen die Verwaltung von Mitarbeitern, Projekten, Arbeitspaketen und Arbeitszeiten.

### Zielgruppe
- Geschäftsführer / Company-Admins (Firmenverwaltung)
- Manager (Projekt- und Teamverwaltung)
- Mitarbeiter (Zeiterfassung)

### Aktueller Entwicklungsstand
✅ **Phase 1 abgeschlossen:** Basis-Setup, Authentifizierung, Dashboard
✅ **Phase 2 abgeschlossen:** Mitarbeiterverwaltung mit erweiterten Funktionen
✅ **Phase 3 abgeschlossen:** Projektverwaltung mit Arbeitspaketen
✅ **Phase 4 in Arbeit:** Zeiterfassung (Excel-Matrix-Ansicht)
🚧 **Phase 5 geplant:** Berichte, Export, Jahresübersicht

### Testumgebung
- **Firma 1:** Cubintec (Entwicklungs-Testdaten)
- **Firma 2:** Alacsystems (Reales Projekt VETIS zur Validierung)

---

## 🛠️ Technologie-Stack

### Frontend
- **Framework:** Next.js 16.0.3 (App Router)
- **Build Tool:** Turbopack
- **Sprache:** TypeScript
- **Styling:** Tailwind CSS
- **UI Pattern:** Server & Client Components

### Backend
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **API:** Next.js API Routes
- **ORM:** Supabase JavaScript Client (@supabase/ssr)

### Infrastructure
- **Hosting:** TBD (Vercel empfohlen)
- **Database Hosting:** Supabase Cloud
- **Version Control:** Git

### Dependencies
```json
{
  "dependencies": {
    "next": "16.0.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.48.1"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "postcss": "^8",
    "tailwindcss": "^3.4.1"
  }
}
```

---

## 🗄️ Datenbank-Schema

### Übersicht der Tabellen

| Tabelle | Beschreibung | Status |
|---------|--------------|--------|
| `companies` | Firmendaten | ✅ Produktiv |
| `user_profiles` | Benutzerprofile mit Rollen | ✅ Produktiv |
| `projects` | Projekte | ✅ Produktiv |
| `work_packages` | Arbeitspakete (APs) | ✅ Produktiv |
| `work_package_assignments` | MA-Zuordnung zu APs | ✅ Produktiv |
| `time_entries` | Zeiteinträge | ✅ Produktiv |
| `public_holidays` | Feiertage (BW 2024/2025) | ✅ Produktiv |

### 1. `companies`
Speichert Firmendaten.

```sql
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  street TEXT NOT NULL,
  house_number TEXT NOT NULL,
  zip TEXT NOT NULL,
  city TEXT NOT NULL,
  state_code TEXT NOT NULL,           -- DE-BW, DE-BY, etc.
  country TEXT DEFAULT 'DE',
  legal_form TEXT,                    -- GmbH, UG, AG, etc.
  trade_register_city TEXT,
  trade_register_number TEXT,
  vat_id TEXT,
  num_employees INTEGER,
  annual_revenue NUMERIC,
  balance_sheet_total NUMERIC,
  industry_wz_code TEXT,
  industry_description TEXT,
  email TEXT,
  website TEXT,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. `user_profiles`
Verknüpft Supabase Auth Users mit Companies und Rollen.

```sql
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('company_admin', 'manager', 'employee')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  
  -- Erweiterte Profildaten (v1.1)
  phone TEXT,
  position TEXT,
  department TEXT,
  employee_number TEXT,
  birth_date DATE,
  street TEXT,
  house_number TEXT,
  zip TEXT,
  city TEXT,
  country TEXT DEFAULT 'DE',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID REFERENCES auth.users(id),
  
  -- Soft Delete (v1.2)
  deleted_at TIMESTAMPTZ,
  deletion_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);
```

### 3. `projects`
Speichert Projektdaten.

```sql
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  project_number TEXT,
  
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'completed', 'archived', 'on_hold')),
  
  start_date DATE,
  end_date DATE,
  estimated_hours NUMERIC,
  
  budget NUMERIC,
  hourly_rate NUMERIC,
  
  client_name TEXT,
  client_contact TEXT,
  
  color TEXT DEFAULT '#3B82F6',
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. `work_packages`
Arbeitspakete für Projekte.

```sql
CREATE TABLE work_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  code TEXT NOT NULL,                  -- "AP1", "AP2.1", "AP2.3.1"
  description TEXT NOT NULL,
  
  category TEXT DEFAULT 'project_work' 
    CHECK (category IN ('project_work', 'non_billable', 'overhead')),
  
  estimated_hours NUMERIC,
  start_date DATE,
  end_date DATE,
  
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, project_id, code)
);
```

### 5. `work_package_assignments`
Zuordnung von Mitarbeitern zu Arbeitspaketen.

```sql
CREATE TABLE work_package_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_package_id UUID REFERENCES work_packages(id) ON DELETE CASCADE NOT NULL,
  user_profile_id UUID REFERENCES user_profiles(id) ON DELETE RESTRICT NOT NULL,
  
  role TEXT,                           -- Rolle im Arbeitspaket
  person_months NUMERIC,               -- Geplante Personenmonate/Stunden
  
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(work_package_id, user_profile_id)
);
```

### 6. `time_entries`
Zeiteinträge der Mitarbeiter.

```sql
CREATE TABLE time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  entry_date DATE NOT NULL,
  
  project_id UUID REFERENCES projects(id) ON DELETE RESTRICT,
  work_package_code TEXT,
  work_package_description TEXT,
  
  hours NUMERIC(5,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
  
  category TEXT NOT NULL DEFAULT 'project_work'
    CHECK (category IN (
      'project_work',
      'non_billable',
      'time_compensation',
      'vacation',
      'sick_leave',
      'other_absence'
    )),
  
  notes TEXT,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_profile_id, entry_date, project_id, work_package_code, category)
);
```

### 7. `public_holidays`
Feiertage für Kalenderberechnungen.

```sql
CREATE TABLE public_holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country TEXT DEFAULT 'DE',
  state_code TEXT,                     -- "BW", "BY", etc.
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(country, state_code, holiday_date)
);
```

### Views

```sql
-- Mitarbeiter-Status Übersicht
CREATE VIEW v_employees_status AS
SELECT 
  up.id,
  up.user_id,
  up.company_id,
  up.name,
  up.email,
  up.role,
  up.is_active,
  up.deleted_at,
  CASE 
    WHEN up.deleted_at IS NOT NULL THEN 'deleted'
    WHEN up.is_active = FALSE THEN 'inactive'
    ELSE 'active'
  END as status
FROM user_profiles up;

-- Monats-Zusammenfassung
CREATE VIEW v_monthly_summary AS
SELECT 
  user_profile_id,
  company_id,
  EXTRACT(YEAR FROM entry_date) as year,
  EXTRACT(MONTH FROM entry_date) as month,
  category,
  project_id,
  SUM(hours) as total_hours,
  COUNT(*) as entry_count
FROM time_entries
GROUP BY user_profile_id, company_id, 
         EXTRACT(YEAR FROM entry_date), 
         EXTRACT(MONTH FROM entry_date), 
         category, project_id;
```

### Functions

```sql
-- Prüfen ob Mitarbeiter gelöscht werden kann
CREATE FUNCTION can_delete_employee(employee_id UUID)
RETURNS TABLE (can_delete BOOLEAN, reason TEXT, ...);

-- Mitarbeiter anonymisieren (DSGVO)
CREATE FUNCTION anonymize_employee(employee_id UUID, reason TEXT)
RETURNS BOOLEAN;
```

---

## ✅ Implementierte Features

### 1. Benutzerregistrierung (`/register`)
**Status:** ✅ Vollständig implementiert

**Funktionen:**
- Zwei-Schritt-Prozess (Admin-Account + Firmendaten)
- Email-Format-Prüfung
- Passwort mindestens 6 Zeichen
- Duplikat-Check für Firmennamen
- Auto-Login und Weiterleitung zum Dashboard

**Datei:** `src/app/register/page.tsx`

---

### 2. Login (`/login`)
**Status:** ✅ Vollständig implementiert

**Funktionen:**
- Email + Passwort Authentifizierung
- Email-Vorausfüllung via URL-Parameter (`?email=...`)
- Auto-Fokus auf Passwort bei vorausgefüllter Email
- is_active Check (deaktivierte MA werden abgewiesen)
- Profil-Validierung

**Datei:** `src/app/login/page.tsx`

---

### 3. Dashboard (`/dashboard`)
**Status:** ✅ Vollständig implementiert

**Funktionen:**
- Header mit Firmenlogo, Name, User, Admin-Badge
- 6 Feature-Kacheln (Projekte, Mitarbeiter, Arbeitspläne, Zeiterfassung, Berichte, Unternehmensdaten)
- Firmeninformations-Box
- Rollenbasierte Sichtbarkeit

**Datei:** `src/app/dashboard/page.tsx`

---

### 4. Mitarbeiterverwaltung (`/mitarbeiter`)
**Status:** ✅ Vollständig implementiert

**Funktionen:**
- Liste aller Mitarbeiter der Firma
- Mitarbeiter einladen (via API Route - Admin bleibt eingeloggt)
- Mitarbeiter bearbeiten (Detail-Seite)
- Mitarbeiter deaktivieren/aktivieren
- Mitarbeiter löschen (nur Admin, mit Sicherheitsabfrage)
- Visuelle Anzeige deaktivierter MA (ausgegraut)
- Rollenbasierte Berechtigungen

**Dateien:**
- `src/app/mitarbeiter/page.tsx`
- `src/app/mitarbeiter/detail/page.tsx`

**API Routes:**
- `POST /api/employees/create`
- `POST /api/employees/activate`
- `POST /api/employees/deactivate`
- `POST /api/employees/delete`

---

### 5. Projektverwaltung (`/projekte`)
**Status:** ✅ Vollständig implementiert

**Funktionen:**
- Projekt-Grid mit farbigen Karten
- Status-Badges (Aktiv, Abgeschlossen, Pausiert, Archiviert)
- Projekt erstellen (Modal)
- Projekt bearbeiten
- Projekt löschen

**Datei:** `src/app/projekte/page.tsx`

---

### 6. Projekt-Detail mit Arbeitspaketen (`/projekte/[id]`)
**Status:** ✅ Vollständig implementiert (v1.2)

**Funktionen:**
- Projekt-Header mit Farbe, Name, Status
- Arbeitspakete-Tabelle mit allen Details
- **AP-CRUD:** Erstellen, Bearbeiten, Löschen (Soft-Delete)
- **Mitarbeiter-Zuordnung:** Modal mit Checkbox-Liste und Stunden-Input
- Statistik-Widgets (Anzahl APs, Stunden, Mitarbeiter)
- Kategorie-Badges (Förderfähig, Nicht förderfähig, Overhead)

**Datei:** `src/app/projekte/[id]/page.tsx`

---

### 7. Zeiterfassung (`/zeiterfassung`)
**Status:** ✅ Basis implementiert, Verbesserungen in Arbeit

**Funktionen:**
- Excel-ähnliche Monatsmatrix (Tage × Arbeitspakete)
- Stunden pro Tag und AP eintragen
- Automatische Summenberechnung (Zeile, Spalte, Gesamt)
- Feiertage markiert (grau)
- Wochenenden markiert (hellgrau)
- Warnung bei > 8h pro Tag (rot)
- Zeile hinzufügen/entfernen
- Speichern-Funktion
- Monatswechsel (< November 2024 >)

**Geplante Verbesserungen (v1.2):**
- Header mit Mitarbeiter-Info
- Filter: Nur zugeordnete APs für Employees
- Geplant/Ist-Anzeige pro AP

**Datei:** `src/app/zeiterfassung/page.tsx`

---

### 8. Middleware (Route Protection)
**Status:** ✅ Vollständig implementiert

**Geschützte Routen:**
- `/dashboard`
- `/projekte`
- `/mitarbeiter`
- `/arbeitsplaene`
- `/zeiterfassung`
- `/berichte`
- `/einstellungen`

**Öffentliche Routen:**
- `/`
- `/login`
- `/register`

**Datei:** `src/middleware.ts`

---

## 📁 Dateistruktur

```
projektzeiterfassung20/
├── src/
│   ├── app/
│   │   ├── page.tsx                        # Root (Redirect)
│   │   ├── layout.tsx                      # Root Layout
│   │   ├── globals.css                     # Global Styles
│   │   ├── login/
│   │   │   └── page.tsx                    # Login (v1.1 - Quick Re-Login)
│   │   ├── register/
│   │   │   └── page.tsx                    # Registration (v1.2 - Fixed)
│   │   ├── dashboard/
│   │   │   └── page.tsx                    # Dashboard
│   │   ├── mitarbeiter/
│   │   │   ├── page.tsx                    # MA-Liste (v1.1 - Actions)
│   │   │   └── detail/
│   │   │       └── page.tsx                # MA-Detail (v1.1 - Erweitert)
│   │   ├── projekte/
│   │   │   ├── page.tsx                    # Projekt-Liste
│   │   │   └── [id]/
│   │   │       └── page.tsx                # Projekt-Detail (v1.2 - AP-CRUD)
│   │   ├── zeiterfassung/
│   │   │   └── page.tsx                    # Zeiterfassung (v1.2 - Matrix)
│   │   └── api/
│   │       ├── employees/
│   │       │   ├── create/
│   │       │   │   └── route.ts            # MA erstellen
│   │       │   ├── activate/
│   │       │   │   └── route.ts            # MA aktivieren
│   │       │   ├── deactivate/
│   │       │   │   └── route.ts            # MA deaktivieren
│   │       │   ├── delete/
│   │       │   │   └── route.ts            # MA löschen
│   │       │   └── anonymize/
│   │       │       └── route.ts            # MA anonymisieren (DSGVO)
│   │       └── time-entries/
│   │           └── route.ts                # Zeiteinträge CRUD
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts                   # Browser Client
│   │       └── server.ts                   # Server Client
│   └── middleware.ts                       # Route Protection
├── public/
├── .env.local                              # Environment Variables
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── docs/                                   # Dokumentation
    ├── PFLICHTENHEFT-v1_2.md
    ├── DATEILISTE-v1_2.md
    └── PHASE-4-ZEITERFASSUNG-KONZEPT.md
```

---

## 🔌 API-Endpunkte

### Mitarbeiter

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| POST | `/api/employees/create` | Neuen MA erstellen |
| POST | `/api/employees/activate` | MA aktivieren |
| POST | `/api/employees/deactivate` | MA deaktivieren |
| POST | `/api/employees/delete` | MA löschen (mit Prüfung) |
| POST | `/api/employees/anonymize` | MA anonymisieren (DSGVO) |

### Zeiteinträge

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/time-entries?start=&end=` | Einträge laden |
| POST | `/api/time-entries` | Eintrag erstellen |
| PUT | `/api/time-entries/:id` | Eintrag aktualisieren |
| DELETE | `/api/time-entries/:id` | Eintrag löschen |

---

## 🔐 Authentifizierung & Autorisierung

### Session Management
- Sessions in HTTP-only Cookies
- Automatische Session-Refresh durch Supabase
- Logout löscht Session und redirected zu `/login`

### Middleware Protection
```typescript
// Nicht eingeloggt + geschützte Route → Login
if (!user && isProtectedRoute) {
  return redirect('/login');
}

// Eingeloggt + Login-Seite → Dashboard
if (user && pathname === '/login') {
  return redirect('/dashboard');
}
```

---

## 👥 Benutzerrollen

### 1. Company Admin
- ✅ Vollzugriff auf alle Firmendaten
- ✅ Mitarbeiter: einladen, bearbeiten, deaktivieren, löschen
- ✅ Projekte: erstellen, bearbeiten, löschen
- ✅ Arbeitspakete: CRUD, Mitarbeiter zuordnen
- ✅ Alle Berichte einsehen
- ✅ Firmendaten bearbeiten

### 2. Manager
- ✅ Mitarbeiter: einladen, bearbeiten, deaktivieren
- ✅ Projekte: erstellen und bearbeiten
- ✅ Arbeitspakete: CRUD, Mitarbeiter zuordnen
- ✅ Team-Berichte einsehen
- ❌ Keine Mitarbeiter-Löschung
- ❌ Keine Firmendaten-Verwaltung

### 3. Employee
- ✅ Eigene Arbeitszeiten erfassen
- ✅ Eigene Berichte einsehen
- ✅ Zugewiesene Projekte/APs sehen
- ❌ Keine Verwaltungsfunktionen
- ❌ Keine Mitarbeiter-Ansicht

---

## 🚀 User Journey

### Neue Firma registrieren

```
1. /register aufrufen
2. Schritt 1: Admin-Daten (Name, Email, Passwort)
3. Schritt 2: Firmendaten (Name, Adresse, Rechtsform)
4. → Firma + Admin + Profil werden erstellt
5. → Auto-Login
6. → Redirect zu /dashboard
```

### Projekt mit Arbeitspaketen anlegen

```
1. /projekte aufrufen
2. "Neues Projekt" klicken
3. Projektdaten eingeben (Name, Kunde, Budget, etc.)
4. Projekt erstellen
5. Auf Projekt-Karte klicken → Detail-Seite
6. "Neues Arbeitspaket" klicken
7. AP-Daten eingeben (Code, Beschreibung, Stunden)
8. AP erstellen
9. "Zuordnen" klicken
10. Mitarbeiter auswählen + Stunden eingeben
11. Speichern
```

### Zeit erfassen

```
1. /zeiterfassung aufrufen
2. Monat auswählen (< November 2024 >)
3. Zeile hinzufügen (+)
4. Arbeitspaket aus Dropdown wählen
5. Stunden in Tages-Zellen eintragen
6. "Speichern" klicken
7. → Einträge werden in DB gespeichert
```

---

## 📋 Offene Punkte / Todo

### Priorität 1 (Diese Woche)

#### Zeiterfassung verbessern
- [ ] Header mit Mitarbeiter-Name anzeigen
- [ ] Filter: Nur zugeordnete APs für Employees
- [ ] Geplant/Ist-Anzeige pro Arbeitspaket
- [ ] Warnung bei fehlenden Zuordnungen

#### Admin-Übersicht
- [ ] `/zeiterfassung/uebersicht` für Admins
- [ ] Alle Mitarbeiter auf einen Blick
- [ ] Filter (Monat, Mitarbeiter, Projekt)
- [ ] Soll/Ist-Vergleich

### Priorität 2 (Nächste Woche)

#### Berichte (`/berichte`)
- [ ] Jahresübersicht (FuE-Dokumentation)
- [ ] Export als Excel (wie Vorlage)
- [ ] Monats-Summen pro Mitarbeiter
- [ ] Projekt-Auswertungen

#### Arbeitspläne (`/arbeitsplaene`)
- [ ] Kalender-Ansicht
- [ ] Schichten planen
- [ ] Urlaub/Krankheit eintragen

### Priorität 3 (Backlog)

- [ ] Email-Benachrichtigungen
- [ ] Passwort-Reset-Funktion
- [ ] Mobile-optimierte Ansicht
- [ ] Dark Mode
- [ ] Mehrsprachigkeit (DE/EN)
- [ ] RLS Policies für Produktion
- [ ] Audit-Log
- [ ] DSGVO-Datenschutz-Einstellungen

---

## 🔧 Installation & Setup

### Voraussetzungen
- Node.js 20+
- pnpm (empfohlen) oder npm
- Supabase Account

### 1. Repository klonen
```bash
git clone <repository-url>
cd projektzeiterfassung20
```

### 2. Dependencies installieren
```bash
pnpm install
```

### 3. Environment Variables
Erstellen Sie `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Datenbank Setup
SQL-Scripts in dieser Reihenfolge ausführen:
1. `complete-cleanup-and-setup.sql` (Basis-Schema)
2. `zeiterfassung-schema.sql` (Zeiterfassungs-Tabellen)
3. `datenbank-safe-delete.sql` (Soft-Delete-Funktionen)

### 5. Development Server starten
```bash
pnpm dev
```

→ Öffnen Sie http://localhost:3000

---

## 🐛 Bekannte Probleme

### 1. TypeScript-Fehler bei Supabase Relations
**Problem:** `project` kann Array oder Object sein
**Lösung:** Helper-Funktion `getProject()` verwenden
**Status:** ✅ Gefixt in v1.2

### 2. Register-Seite Redirect
**Problem:** /register leitete zu /login
**Ursache:** Falsche Datei im register-Ordner
**Lösung:** Korrekte register/page.tsx deployed
**Status:** ✅ Gefixt in v1.2

### 3. RLS Policies deaktiviert
**Problem:** Row Level Security ist deaktiviert
**Impact:** In Produktion könnten alle User alle Daten sehen
**Status:** ⚠️ Muss vor Production aktiviert werden

### 4. Keine Email-Bestätigung
**Problem:** User können sich ohne Email-Bestätigung registrieren
**Status:** 🚧 Für MVP OK, später aktivieren

---

## 📊 Metriken & Statistiken

### Code-Statistiken (Stand 28.11.2024)
- **Zeilen Code:** ~5.000 LOC
- **React Components:** 10 Pages
- **API Routes:** 6
- **Datenbank-Tabellen:** 7
- **Views:** 2
- **Functions:** 2

### Test-Firmen
| Firma | Status | Projekte | Mitarbeiter |
|-------|--------|----------|-------------|
| Cubintec | Test | 0 | 5 |
| Alacsystems | Validierung | 1 (VETIS) | In Anlage |

---

## 🎉 Changelog

### Version 1.2 (28. November 2024)

**Zeiterfassung:**
- ✅ Excel-Matrix Monatsansicht implementiert
- ✅ Arbeitspakete × Tage Grid
- ✅ Automatische Summenberechnung
- ✅ Feiertage-Integration (BW 2024/2025)
- ✅ Wochenend-Markierung
- ✅ Speichern-Funktion

**Projekt-Detail mit AP-CRUD:**
- ✅ Arbeitspakete erstellen/bearbeiten/löschen
- ✅ Mitarbeiter zu APs zuordnen (Modal)
- ✅ Stunden pro Zuordnung erfassen
- ✅ Statistik-Widgets

**Bugfixes:**
- ✅ Register-Seite funktioniert wieder
- ✅ TypeScript-Fehler bei project-Relations gefixt
- ✅ Middleware erlaubt /register korrekt

**Datenbank:**
- ✅ time_entries Tabelle
- ✅ public_holidays Tabelle (12 Feiertage BW)
- ✅ Views für Zusammenfassungen

### Version 1.1 (27. November 2024)
- ✅ Mitarbeiterverwaltung erweitert
- ✅ Projektverwaltung implementiert
- ✅ API Routes für MA-Aktionen
- ✅ Quick Re-Login nach MA-Einladung

### Version 1.0 (26. November 2024)
- ✅ Basis-Setup
- ✅ Authentifizierung (Login/Register)
- ✅ Dashboard
- ✅ Middleware Protection

---

## 📞 Support & Kontakt

**Entwickler:** Martin Ditscherlein
**Projekt:** Projektzeiterfassung v1.2
**Letzte Aktualisierung:** 28. November 2024

---

**Ende der Dokumentation - Version 1.2**
