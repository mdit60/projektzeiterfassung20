# Projektzeiterfassung - Pflichtenheft & Dokumentation
**Stand:** 27. November 2024
**Version:** 1.1 - Mitarbeiterverwaltung & Projektverwaltung Complete
**Git Tag:** v1.1

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

---

## 🎯 Projektübersicht

### Zweck
Web-Anwendung zur Zeiterfassung für kleine und mittelständische Unternehmen. Ermöglicht Firmen die Verwaltung von Mitarbeitern, Projekten, Arbeitsplänen und Arbeitszeiten.

### Zielgruppe
- Geschäftsführer / Company-Admins (Firmenverwaltung)
- Manager (Projekt- und Teamverwaltung)
- Mitarbeiter (Zeiterfassung)

### Aktueller Entwicklungsstand
✅ **Phase 1 abgeschlossen:** Basis-Setup, Authentifizierung, Dashboard
✅ **Phase 2 abgeschlossen:** Mitarbeiterverwaltung mit erweiterten Funktionen
✅ **Phase 3 abgeschlossen:** Projektverwaltung
🚧 **Phase 4 in Planung:** Arbeitspläne, Zeiterfassung, Berichte

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

---

## 🗄️ Datenbank-Schema

### Tabellen

#### 1. `companies`
Speichert Firmendaten.

```sql
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

#### 2. `user_profiles`
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
  
  -- Status (v1.1)
  is_active BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);
```

#### 3. `projects` (v1.1 NEU)
Speichert Projektdaten.

```sql
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  project_number TEXT,
  
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived', 'on_hold')),
  
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

#### 4. `project_assignments` (v1.1 NEU)
Verknüpft Mitarbeiter mit Projekten (Many-to-Many).

```sql
CREATE TABLE project_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  
  role TEXT,
  
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, user_profile_id)
);
```

### Row Level Security (RLS)

**Aktueller Status:** Deaktiviert für Entwicklung

```sql
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments DISABLE ROW LEVEL SECURITY;
```

---

## ✅ Implementierte Features

### 1. Benutzerregistrierung (`/register`)
**Status:** ✅ Vollständig implementiert

**Datei:** `src/app/register/page.tsx`

**Funktionen:**
- Zwei-Schritt-Prozess (Admin + Firmendaten)
- Email-Format-Prüfung
- Passwort mindestens 6 Zeichen
- Duplikat-Check für Firmennamen
- Auto-Login und Weiterleitung

---

### 2. Login (`/login`)
**Status:** ✅ Vollständig implementiert (v1.1 aktualisiert)

**Datei:** `src/app/login/page.tsx`

**Neue Features v1.1:**
- ✅ Email-Vorausfüllung via URL-Parameter (`?email=admin@firma.de`)
- ✅ Auto-Fokus auf Passwort-Feld bei vorausgefüllter Email
- ✅ Quick Re-Login nach MA-Einladung
- ✅ is_active Check (deaktivierte Mitarbeiter werden abgewiesen)

**Ablauf:**
1. Supabase Auth Login
2. Profil-Check in `user_profiles`
3. is_active Check
4. Weiterleitung zu `/dashboard`

---

### 3. Dashboard (`/dashboard`)
**Status:** ✅ Vollständig implementiert

**Datei:** `src/app/dashboard/page.tsx`

**Features:**
- Firmenlogo, Firmenname, Username, Admin-Badge
- 6 Feature-Kacheln (Projekte, Mitarbeiter, Arbeitspläne, Zeiterfassung, Berichte, Unternehmensdaten)
- Firmeninformations-Box
- Logout-Button

---

### 4. Mitarbeiterverwaltung (`/mitarbeiter`)
**Status:** ✅ Vollständig implementiert (v1.1)

**Datei:** `src/app/mitarbeiter/page.tsx`

**Features:**
- ✅ Liste aller Mitarbeiter der Firma
- ✅ Mitarbeiter einladen (Name, Email, Passwort, Rolle)
- ✅ **Quick Re-Login** nach Einladung (Admin-Email vorausgefüllt)
- ✅ Mitarbeiter bearbeiten
- ✅ Mitarbeiter deaktivieren/aktivieren (Icon-Buttons)
- ✅ Mitarbeiter löschen (nur Admin)
- ✅ Visuelle Anzeige deaktivierter Mitarbeiter (ausgegraut)
- ✅ Rollenbasierte Berechtigungen
- ✅ Action-Buttons: Bearbeiten (Blau), Deaktivieren (Orange), Aktivieren (Grün), Löschen (Rot)

**Berechtigungen:**
- Employee: Sieht keine Mitarbeiter (Redirect zu Dashboard)
- Manager: Kann bearbeiten, deaktivieren, aktivieren
- Admin: Alle Rechte inkl. Löschen

---

### 5. Mitarbeiter-Detail (`/mitarbeiter/detail`)
**Status:** ✅ Vollständig implementiert (v1.1)

**Datei:** `src/app/mitarbeiter/detail/page.tsx`

**Features:**
- ✅ Erweiterte Profildaten anzeigen und bearbeiten
- ✅ Persönliche Daten (Name, Email, Telefon, Position, Abteilung)
- ✅ Adresse (Straße, PLZ, Stadt, Land)
- ✅ Unternehmensdaten (Personalnummer, Geburtsdatum)
- ✅ Status-Anzeige (Aktiv/Deaktiviert)
- ✅ Speichern-Button
- ✅ Zurück-Button

---

### 6. Projektverwaltung (`/projekte`)
**Status:** ✅ Vollständig implementiert (v1.1 NEU)

**Datei:** `src/app/projekte/page.tsx`

**Features:**
- ✅ Projekt-Grid mit farbigen Karten
- ✅ Status-Badges (Aktiv, Abgeschlossen, Pausiert, Archiviert)
- ✅ "Neues Projekt" Button (Admin/Manager)
- ✅ Projekt-Erstellung Modal mit allen Feldern:
  - Name, Beschreibung, Kunde
  - Start-/Enddatum, Budget, Stundensatz
  - Geschätzte Stunden
  - Projektnummer
  - Farbe (für UI)
  - Status
- ✅ Click auf Karte → Detail-Seite
- ✅ Leere-Ansicht wenn keine Projekte

**Berechtigungen:**
- Employee: Kann Projekte sehen
- Manager: Kann erstellen und bearbeiten
- Admin: Alle Rechte

---

### 7. Projekt-Detail (`/projekte/[id]`)
**Status:** ✅ Vollständig implementiert (v1.1 NEU)

**Datei:** `src/app/projekte/[id]/page.tsx`

**Features:**
- ✅ Projekt-Header mit Farbe, Name, Status
- ✅ **View-Modus:** Alle Details übersichtlich
- ✅ **Edit-Modus:** Alle Felder bearbeitbar
- ✅ "Bearbeiten" Button (Admin/Manager)
- ✅ "Löschen" Button (Admin/Manager)
- ✅ "Speichern" / "Abbrechen" im Edit-Modus
- ✅ Zugewiesene Mitarbeiter anzeigen (noch nicht zuordbar)
- ✅ Projektdetails: Projektnummer, Kunde, Zeitraum, Budget, etc.
- ✅ Success/Error Messages

**Next.js 16 Compatibility:**
- ✅ Verwendet `use()` für async params
- ✅ Promise-basierter params-Zugriff

---

### 8. API-Endpunkte (v1.1)
**Status:** ✅ Implementiert

#### Mitarbeiter:
- `POST /api/employees/deactivate` - Mitarbeiter deaktivieren
- `POST /api/employees/activate` - Mitarbeiter aktivieren
- `POST /api/employees/delete` - Mitarbeiter löschen (inkl. Auth-User)

**Dateien:**
- `src/app/api/employees/deactivate/route.ts`
- `src/app/api/employees/activate/route.ts`
- `src/app/api/employees/delete/route.ts`

---

### 9. Middleware (Route Protection)
**Status:** ✅ Vollständig implementiert

**Datei:** `src/middleware.ts`

**Geschützte Routen:**
```typescript
const protectedRoutes = [
  '/dashboard',
  '/projekte',
  '/mitarbeiter',
  '/arbeitsplaene',
  '/zeiterfassung',
  '/berichte',
  '/einstellungen'
];
```

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
│   │   │   └── page.tsx                    # Registration
│   │   ├── dashboard/
│   │   │   └── page.tsx                    # Dashboard
│   │   ├── mitarbeiter/
│   │   │   ├── page.tsx                    # MA-Liste (v1.1 - Actions)
│   │   │   └── detail/
│   │   │       └── page.tsx                # MA-Detail (v1.1 - Erweitert)
│   │   ├── projekte/                       # v1.1 NEU
│   │   │   ├── page.tsx                    # Projekt-Liste
│   │   │   └── [id]/
│   │   │       └── page.tsx                # Projekt-Detail
│   │   └── api/
│   │       └── employees/                  # v1.1 NEU
│   │           ├── deactivate/
│   │           │   └── route.ts
│   │           ├── activate/
│   │           │   └── route.ts
│   │           └── delete/
│   │               └── route.ts
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts                   # Browser Client
│   │       └── server.ts                   # Server Client
│   └── middleware.ts                       # Route Protection
├── .env.local                              # Environment Variables
├── package.json
└── PFLICHTENHEFT-v1_1.md                  # Dieses Dokument
```

---

## 🔐 Authentifizierung & Autorisierung

### Quick Re-Login Flow (v1.1 NEU)

**Problem:** Admin wird beim MA-Einladen ausgeloggt (Supabase signUp() Verhalten)

**Lösung:**
1. Admin erstellt Mitarbeiter
2. Neuer MA wird automatisch ausgeloggt
3. Redirect zu `/login?email=admin@firma.de`
4. Admin gibt nur noch Passwort ein
5. Sofort wieder eingeloggt

**Implementierung:**
```typescript
// mitarbeiter/page.tsx - Nach MA-Erstellung:
await supabase.auth.signOut(); // MA ausloggen
window.location.href = `/login?email=${encodeURIComponent(adminEmail)}`;

// login/page.tsx - Email aus URL laden:
const params = new URLSearchParams(window.location.search);
const emailParam = params.get('email');
if (emailParam) setEmail(emailParam);
```

### Login-Sperre für deaktivierte Mitarbeiter (v1.1)

```typescript
// login/page.tsx
if (profileData.is_active === false) {
  await supabase.auth.signOut();
  throw new Error('Ihr Account wurde deaktiviert.');
}
```

---

## 👥 Benutzerrollen

### 1. Company Admin
**Rechte:**
- ✅ Vollzugriff auf alle Firmendaten
- ✅ Mitarbeiter einladen, bearbeiten, deaktivieren, löschen
- ✅ Projekte erstellen, bearbeiten, löschen
- ✅ Arbeitspläne erstellen
- ✅ Alle Berichte einsehen
- ✅ Firmendaten bearbeiten

### 2. Manager
**Rechte:**
- ✅ Mitarbeiter einladen, bearbeiten, deaktivieren
- ✅ Projekte erstellen und bearbeiten
- ✅ Arbeitspläne erstellen
- ✅ Team-Berichte einsehen
- ❌ Keine Mitarbeiter-Löschung
- ❌ Keine Firmendaten-Verwaltung

### 3. Employee
**Rechte:**
- ✅ Eigene Arbeitszeiten erfassen
- ✅ Eigene Berichte einsehen
- ✅ Zugewiesene Projekte sehen
- ❌ Keine Verwaltungsfunktionen
- ❌ Keine Mitarbeiter-Ansicht

---

## 🚀 User Journey

### Quick Re-Login nach MA-Einladung (v1.1)

```
Admin → /mitarbeiter
  ↓
"Mitarbeiter einladen" klicken
  ↓
Formular ausfüllen (Name, Email, Passwort, Rolle)
  ↓
"Einladen" klicken
  ↓
Mitarbeiter wird erstellt ✅
Neuer MA wird ausgeloggt ✅
  ↓
Redirect zu /login?email=admin@firma.de
  ↓
Email-Feld ist vorausgefüllt ✅
Cursor im Passwort-Feld ✅
  ↓
Admin gibt Passwort ein → Enter
  ↓
Sofort wieder eingeloggt! 🎉
```

### Projekt erstellen und bearbeiten (v1.1 NEU)

```
Admin/Manager → /projekte
  ↓
"Neues Projekt" klicken
  ↓
Modal öffnet sich
  ↓
Alle Felder ausfüllen (Name, Kunde, Budget, etc.)
  ↓
"Projekt erstellen" klicken
  ↓
Projekt erscheint in Grid ✅
  ↓
Auf Projekt-Karte klicken
  ↓
Detail-Seite öffnet sich
  ↓
"Bearbeiten" klicken
  ↓
Alle Felder werden bearbeitbar
  ↓
Änderungen vornehmen
  ↓
"Speichern" klicken
  ↓
Änderungen gespeichert ✅
Zurück zur Ansicht
```

---

## 📋 Offene Punkte / Todo

### Priorität 1 (Nächste Phase)

#### Mitarbeiter zu Projekten zuordnen
- [ ] "Mitarbeiter zuweisen" Button in Projekt-Detail
- [ ] Modal mit Liste verfügbarer Mitarbeiter
- [ ] Zuordnung speichern in `project_assignments`
- [ ] Zuordnung entfernen
- [ ] Rolle im Projekt vergeben (optional)

#### Arbeitspläne (`/arbeitsplaene`)
- [ ] Kalender-Ansicht (Woche/Monat)
- [ ] Schichten erstellen (Datum, Uhrzeit)
- [ ] Mitarbeiter zu Schichten zuweisen
- [ ] Urlaub/Krankheit eintragen
- [ ] Konflikte erkennen (Doppelbuchungen)

### Priorität 2

#### Zeiterfassung (`/zeiterfassung`)
- [ ] Start/Stopp Timer für aktuelle Arbeit
- [ ] Projekt auswählen
- [ ] Manuelle Zeiteinträge (Datum, von-bis, Projekt)
- [ ] Pausen-Tracking
- [ ] Tages-/Wochen-/Monatsübersicht
- [ ] Zeiteinträge bearbeiten/löschen

#### Berichte (`/berichte`)
- [ ] Gesamt-Arbeitszeiten pro Mitarbeiter
- [ ] Stunden pro Projekt
- [ ] Zeitraum-Filter
- [ ] Export als CSV/PDF
- [ ] Grafische Darstellung (Charts)
- [ ] Budget vs. Ist-Vergleich

### Priorität 3

#### Einstellungen (`/einstellungen`)
- [ ] Firmendaten bearbeiten (nur Admin)
- [ ] Profil-Einstellungen
- [ ] Passwort ändern
- [ ] Benachrichtigungs-Einstellungen

### Backlog

- [ ] Email-Bestätigung für MA-Einladung (Production)
- [ ] Benachrichtigungssystem
- [ ] Mobile-optimierte Ansicht
- [ ] Mehrsprachigkeit (DE/EN)
- [ ] Dark Mode
- [ ] API für externe Integrationen
- [ ] Audit-Log (Wer hat was geändert)
- [ ] Datenschutz-Einstellungen (DSGVO)
- [ ] RLS Policies für Produktion aktivieren
- [ ] Backup-System
- [ ] Performance-Optimierung

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

### 4. Supabase Setup

**SQL ausführen (in dieser Reihenfolge):**

1. Companies & User Profiles:
```sql
-- Siehe Datenbank-Schema oben
```

2. Erweiterte User Profile Felder (v1.1):
```sql
ALTER TABLE user_profiles ADD COLUMN phone TEXT;
ALTER TABLE user_profiles ADD COLUMN position TEXT;
ALTER TABLE user_profiles ADD COLUMN department TEXT;
ALTER TABLE user_profiles ADD COLUMN employee_number TEXT;
ALTER TABLE user_profiles ADD COLUMN birth_date DATE;
ALTER TABLE user_profiles ADD COLUMN street TEXT;
ALTER TABLE user_profiles ADD COLUMN house_number TEXT;
ALTER TABLE user_profiles ADD COLUMN zip TEXT;
ALTER TABLE user_profiles ADD COLUMN city TEXT;
ALTER TABLE user_profiles ADD COLUMN country TEXT DEFAULT 'DE';
ALTER TABLE user_profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN deactivated_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN deactivated_by UUID REFERENCES auth.users(id);
```

3. Projekte (v1.1):
```sql
-- Siehe projekte-schema.sql
```

4. RLS deaktivieren (Development):
```sql
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments DISABLE ROW LEVEL SECURITY;
```

### 5. Development Server starten
```bash
pnpm dev
```

→ Öffnen Sie http://localhost:3000

---

## 🐛 Bekannte Probleme

### 1. Admin-Logout bei MA-Einladung
**Problem:** Admin wird beim Einladen ausgeloggt
**Workaround:** ✅ Quick Re-Login implementiert (Email vorausgefüllt)
**Status:** ✅ Gelöst durch UX-Verbesserung
**Langfristig:** Email-Bestätigung aktivieren (Production)

### 2. RLS Policies deaktiviert
**Problem:** Row Level Security ist komplett deaktiviert
**Impact:** In Produktion könnten alle User alle Daten sehen
**Status:** ⚠️ Für Development OK
**Lösung:** RLS Policies vor Production aktivieren

### 3. Next.js 16 Dynamic Routes
**Problem:** `params` ist Promise in Next.js 16
**Lösung:** ✅ Verwende `use(params)` statt direktem Zugriff
**Status:** ✅ Implementiert in `/projekte/[id]`

### 4. Keine Email-Bestätigung
**Problem:** User können sich ohne Email-Bestätigung registrieren
**Impact:** Fake-Accounts möglich
**Status:** 🚧 Für MVP OK
**Lösung:** Supabase Email-Confirmation für Production aktivieren

### 5. Keine Passwort-Reset-Funktion
**Problem:** User können Passwort nicht zurücksetzen
**Status:** 🚧 Todo
**Lösung:** "Passwort vergessen" Flow implementieren

---

## 📊 Metriken & Statistiken

### Code-Statistiken (Stand 27.11.2024)
- **Zeilen Code (geschätzt):** ~3.500 LOC
- **Komponenten:** 8 Pages, 3 API Routes, 1 Middleware
- **Datenbank-Tabellen:** 4
- **Dependencies:** 5 production, 7 development

### Features
- **Implementiert:** 9 Major Features
- **In Entwicklung:** 0
- **Geplant:** 15+ Features

### Datenbank
- **Tabellen:** 4 (companies, user_profiles, projects, project_assignments)
- **Spalten gesamt:** ~60
- **Indizes:** 8
- **Functions:** 2

---

## 🎉 Changelog

### Version 1.1 (27. November 2024)

**Mitarbeiterverwaltung - Erweitert:**
- ✅ Erweiterte Profildaten (Telefon, Position, Abteilung, Adresse, etc.)
- ✅ Mitarbeiter-Detail-Seite mit Bearbeitung
- ✅ Mitarbeiter deaktivieren/aktivieren
- ✅ Mitarbeiter löschen (Admin only)
- ✅ Action-Buttons (Icon-basiert)
- ✅ Visuelle Anzeige deaktivierter Mitarbeiter
- ✅ Login-Sperre für deaktivierte Mitarbeiter
- ✅ Quick Re-Login nach MA-Einladung

**Projektverwaltung - NEU:**
- ✅ Projekt-Liste mit Grid-Ansicht
- ✅ Projekt erstellen (Modal)
- ✅ Projekt-Detail-Seite
- ✅ Projekt bearbeiten
- ✅ Projekt löschen
- ✅ Status-Management (Aktiv, Abgeschlossen, Pausiert, Archiviert)
- ✅ Budget, Stundensatz, Zeitraum
- ✅ Kunde-Informationen
- ✅ Farbige Projekt-Karten
- ✅ Zugewiesene Mitarbeiter anzeigen

**Technische Verbesserungen:**
- ✅ Next.js 16 Compatibility (`use()` für async params)
- ✅ API Routes für MA-Aktionen
- ✅ Besseres Error Handling
- ✅ Success/Error Messages überall

**Datenbank:**
- ✅ user_profiles erweitert (11 neue Spalten)
- ✅ projects Tabelle neu
- ✅ project_assignments Tabelle neu
- ✅ Indizes optimiert

### Version 1.0 (26. November 2024)
- ✅ Basis-Setup
- ✅ Authentifizierung (Login/Register)
- ✅ Dashboard
- ✅ Mitarbeiterverwaltung (Basis)
- ✅ Middleware Protection

---

## 📞 Support & Kontakt

**Entwickler:** Martin Ditscherlein
**Projekt:** Projektzeiterfassung v1.1
**Letzte Aktualisierung:** 27. November 2024

---

## ✅ Abnahme-Checkliste (Phase 3 - v1.1)

### Mitarbeiterverwaltung
- [x] Mitarbeiter einladen mit Quick Re-Login
- [x] Erweiterte Profildaten bearbeiten
- [x] Mitarbeiter deaktivieren/aktivieren
- [x] Mitarbeiter löschen (Admin)
- [x] Login-Sperre für deaktivierte Mitarbeiter
- [x] Action-Buttons funktionieren
- [x] Visuelle Deaktivierungs-Anzeige
- [x] Rollenbasierte Berechtigungen

### Projektverwaltung
- [x] Projekt erstellen
- [x] Projekt-Liste anzeigen
- [x] Projekt-Detail-Seite
- [x] Projekt bearbeiten
- [x] Projekt löschen
- [x] Status-Management
- [x] Budget und Zeitraum erfassen
- [x] Farbige Karten
- [x] Next.js 16 Dynamic Routes funktionieren

**Phase 3: ✅ ABGESCHLOSSEN**

---

**Ende der Dokumentation - Version 1.1**