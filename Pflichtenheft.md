# Projektzeiterfassung - Pflichtenheft & Dokumentation
**Stand:** 26. November 2024
**Version:** 1.0 - Authentication & Dashboard Complete
**Git Tag:** v1.0

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
🚧 **Phase 2 in Planung:** Mitarbeiterverwaltung, Projekte, Zeiterfassung

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

-- Indizes
CREATE INDEX idx_companies_admin_id ON companies(admin_id);
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Indizes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_company_id ON user_profiles(company_id);
```

### Row Level Security (RLS)

**Aktueller Status:** Deaktiviert für Entwicklung

```sql
-- RLS ist aktuell deaktiviert für einfachere Entwicklung
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
```

**Für Produktion vorbereitet:**
```sql
-- Policies für Production (aktuell nicht aktiv)
-- Companies: Jeder authentifizierte User kann alle sehen
-- User Profiles: Jeder kann alle sehen
-- Später: Restriktivere Policies basierend auf company_id
```

---

## ✅ Implementierte Features

### 1. Benutzerregistrierung (`/register`)
**Status:** ✅ Vollständig implementiert

**Funktionen:**
- Zwei-Schritt-Prozess:
  1. Admin-Account erstellen (Name, Email, Passwort)
  2. Firmendaten eingeben (Name, Adresse, Rechtsform, etc.)
- Validierung:
  - Email-Format-Prüfung
  - Passwort mindestens 6 Zeichen
  - Duplikat-Check für Firmennamen (case-insensitive)
- Ablauf:
  1. User in Supabase Auth erstellen
  2. Session aktivieren (2 Sekunden Wartezeit)
  3. Firmenname-Duplikat prüfen
  4. Company-Eintrag erstellen
  5. user_profiles-Eintrag mit Rolle `company_admin` erstellen
  6. Auto-Login und Weiterleitung zum Dashboard

**Fehlerbehandlung:**
- Ungültige Email → Fehlermeldung
- Firma existiert bereits → Fehlermeldung mit Hinweis
- Session-Fehler → Fehlermeldung

**Datei:** `src/app/register/page.tsx`

---

### 2. Login (`/login`)
**Status:** ✅ Vollständig implementiert

**Funktionen:**
- Email + Passwort Authentifizierung
- Profil-Validierung: User ohne `user_profiles` Eintrag werden abgewiesen
- Fehlerbehandlung:
  - Falsche Credentials → "Ungültige E-Mail oder Passwort"
  - Kein Profil → "Kein Benutzerprofil gefunden. Bitte registrieren Sie sich zuerst."
- Auto-Weiterleitung zum Dashboard nach erfolgreichem Login
- Link zur Registrierung

**Ablauf:**
1. Supabase Auth Login
2. Profil-Check in `user_profiles` Tabelle
3. Falls kein Profil → Logout + Fehlermeldung
4. Falls Profil vorhanden → Weiterleitung zu `/dashboard`

**Datei:** `src/app/login/page.tsx`

---

### 3. Dashboard (`/dashboard`)
**Status:** ✅ Vollständig implementiert

**Funktionen:**
- **Header:**
  - Firmenlogo (Gebäude-Icon)
  - Firmenname (aus `companies` Tabelle)
  - Benutzername (aus `user_profiles`)
  - Admin-Badge (wenn `role = 'company_admin'`)
  - Logout-Button

- **Hauptbereich:**
  - Begrüßung: "Willkommen, [Name]!"
  - 6 Feature-Kacheln:
    1. ✅ Projekte
    2. ✅ Mitarbeiter
    3. ✅ Arbeitspläne
    4. ✅ Zeiterfassung
    5. ✅ Berichte
    6. ✅ **Unternehmensdaten** (nur für Company-Admins, grüner Rand)

- **Firmeninformations-Box:**
  - Firmenname
  - Rechtsform
  - USt-ID
  - Adresse
  - Email
  - Website (klickbar)
  - "Bearbeiten"-Button (nur für Company-Admins)

**Fehlerbehandlung:**
- Wenn Profil nicht geladen werden kann → Rote Fehlerbox mit Debug-Hinweisen
- Wenn Company nicht geladen werden kann → Nur Warnung, Rest funktioniert

**Datenladen:**
```typescript
1. User aus Supabase Auth laden
2. user_profiles laden basierend auf user_id
3. companies laden basierend auf company_id
```

**Datei:** `src/app/dashboard/page.tsx`

---

### 4. Root Page (`/`)
**Status:** ✅ Vollständig implementiert

**Funktionen:**
- Automatische Weiterleitung basierend auf Auth-Status:
  - Nicht eingeloggt → `/login`
  - Eingeloggt → `/dashboard`
- Server-side Redirect (keine Client-Side Navigation)

**Datei:** `src/app/page.tsx`

---

### 5. Middleware (Route Protection)
**Status:** ✅ Vollständig implementiert

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

**Funktionen:**
- Session-Check bei jedem Request
- Redirect zu `/login` wenn nicht authentifiziert
- Redirect zu `/dashboard` wenn auf `/login` aber bereits eingeloggt
- Public Routes: `/`, `/login`, `/register`

**Datei:** `src/middleware.ts`

---

### 6. Supabase Integration
**Status:** ✅ Vollständig implementiert

**Client-Side:**
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Server-Side:**
```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}
```

**Environment Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📁 Dateistruktur

```
projektzeiterfassung20/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Root (Redirect Logic)
│   │   ├── layout.tsx                  # Root Layout
│   │   ├── globals.css                 # Global Styles
│   │   ├── login/
│   │   │   └── page.tsx                # Login Page
│   │   ├── register/
│   │   │   └── page.tsx                # Registration Page
│   │   ├── dashboard/
│   │   │   └── page.tsx                # Dashboard
│   │   └── api/
│   │       └── company/
│   │           └── create/
│   │               └── route.ts        # Company Creation API (optional)
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts               # Browser Client
│   │       └── server.ts               # Server Client
│   └── middleware.ts                   # Route Protection
├── public/
├── .env.local                          # Environment Variables (NOT in Git!)
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## 🔐 Authentifizierung & Autorisierung

### Authentifizierungs-Flow

**Registrierung:**
```
User → Registrierung → Supabase Auth (signUp)
                    → Session erstellen
                    → Company erstellen
                    → user_profiles erstellen (role: company_admin)
                    → Auto-Login
                    → Redirect zu /dashboard
```

**Login:**
```
User → Login → Supabase Auth (signInWithPassword)
            → Profil-Check in user_profiles
            → Falls kein Profil: Logout + Fehler
            → Falls Profil OK: Redirect zu /dashboard
```

**Session Management:**
- Sessions werden in HTTP-only Cookies gespeichert
- Automatische Session-Refresh durch Supabase
- Session bleibt beim Browser-Schließen erhalten
- Logout löscht Session und redirected zu `/login`

### Middleware Protection

```typescript
// Geschützte Routen
if (isProtectedRoute && !user) {
  return NextResponse.redirect(new URL('/login', request.url));
}

// Bereits eingeloggt auf Login-Page
if (request.nextUrl.pathname === '/login' && user) {
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
```

---

## 👥 Benutzerrollen

### 1. Company Admin
**Rechte:**
- ✅ Vollzugriff auf alle Firmendaten
- ✅ Mitarbeiter einladen und verwalten
- ✅ Projekte erstellen und verwalten
- ✅ Arbeitspläne erstellen
- ✅ Berichte einsehen
- ✅ Firmendaten bearbeiten
- ✅ Sieht "Unternehmensdaten"-Kachel im Dashboard

**Erkennung:**
```typescript
const isAdmin = profile?.role === 'company_admin';
```

### 2. Manager
**Rechte (geplant):**
- Projekte verwalten
- Team-Mitarbeiter zuweisen
- Arbeitspläne erstellen
- Team-Berichte einsehen
- ❌ Keine Firmendaten-Verwaltung

**Status:** 🚧 Noch nicht implementiert

### 3. Employee
**Rechte (geplant):**
- Eigene Arbeitszeiten erfassen
- Eigene Berichte einsehen
- Zugewiesene Projekte sehen
- ❌ Keine Verwaltungsfunktionen

**Status:** 🚧 Noch nicht implementiert

---

## 🚀 User Journey

### Neuer Company-Admin (Erstregistrierung)

```
1. Besucht / → Redirect zu /login
2. Klickt "Neue Firma registrieren"
3. Füllt Admin-Daten aus (Name, Email, Passwort)
4. Klickt "Weiter zu Firmendaten"
5. Füllt Firmendaten aus (Name, Adresse, Rechtsform, etc.)
6. Klickt "Firma registrieren"
7. System erstellt:
   - User in auth.users
   - Firma in companies
   - Profil in user_profiles (role: company_admin)
8. Auto-Login
9. Redirect zu /dashboard
10. Sieht vollständiges Dashboard mit:
    - Firmenname im Header
    - Eigenem Namen
    - Admin-Badge
    - Alle 6 Kacheln (inkl. Unternehmensdaten)
    - Firmeninformations-Box
```

### Wiederkehrender User (Login)

```
1. Besucht / → Redirect zu /login
2. Gibt Email + Passwort ein
3. Klickt "Anmelden"
4. System prüft:
   - Auth-Credentials ✅
   - Profil existiert ✅
5. Redirect zu /dashboard
6. Sieht Dashboard mit allen Daten
```

### Nicht-registrierter User versucht Login

```
1. Besucht /login
2. Gibt unregistrierte Email + beliebiges Passwort ein
3. Klickt "Anmelden"
4. System prüft:
   - Auth-Credentials ✅ (User existiert in auth.users)
   - Profil existiert ❌ (Kein Eintrag in user_profiles)
5. System loggt User sofort wieder aus
6. Zeigt Fehler: "Kein Benutzerprofil gefunden. Bitte registrieren Sie sich zuerst."
7. User klickt "Neue Firma registrieren"
8. → Registrierungs-Flow
```

---

## 📋 Offene Punkte / Todo

### Priorität 1 (Nächste Phase)

#### Einstellungen-Seite (`/einstellungen`)
- [ ] Firmendaten bearbeiten (nur Company-Admin)
- [ ] Formular mit allen Company-Feldern
- [ ] Speichern-Funktion
- [ ] Success/Error Messages

#### Mitarbeiterverwaltung (`/mitarbeiter`)
- [ ] Liste aller Mitarbeiter der Firma
- [ ] Neuen Mitarbeiter einladen (Email)
- [ ] Rolle zuweisen (Manager, Employee)
- [ ] Mitarbeiter deaktivieren/löschen
- [ ] Invite-System mit Email-Bestätigung

### Priorität 2

#### Projekt-Verwaltung (`/projekte`)
- [ ] Projekte erstellen, bearbeiten, löschen
- [ ] Projekt-Details (Name, Beschreibung, Budget, Zeitraum)
- [ ] Mitarbeiter zu Projekten zuweisen
- [ ] Projekt-Status (Aktiv, Abgeschlossen, Archiviert)

#### Arbeitsplan-Verwaltung (`/arbeitsplaene`)
- [ ] Schichten definieren (Montag-Sonntag, Uhrzeiten)
- [ ] Mitarbeiter zu Schichten zuweisen
- [ ] Kalender-Ansicht
- [ ] Urlaub/Krankheit eintragen

### Priorität 3

#### Zeiterfassung (`/zeiterfassung`)
- [ ] Start/Stopp Timer für aktuelle Arbeit
- [ ] Manuelle Zeiteinträge
- [ ] Projekt-Zuordnung
- [ ] Pausen-Tracking
- [ ] Tages-/Wochen-/Monatsübersicht

#### Berichte (`/berichte`)
- [ ] Gesamt-Arbeitszeiten pro Mitarbeiter
- [ ] Projekt-Auswertungen
- [ ] Export als PDF/Excel
- [ ] Zeitraum-Filter
- [ ] Grafische Darstellung

### Backlog

- [ ] Benachrichtigungssystem
- [ ] Email-Versand (Einladungen, Berichte)
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
- npm oder pnpm
- Supabase Account

### 1. Repository klonen
```bash
git clone https://github.com/IHR-USERNAME/projektzeiterfassung20.git
cd projektzeiterfassung20
```

### 2. Dependencies installieren
```bash
npm install
```

### 3. Environment Variables
Erstellen Sie `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Supabase Setup

**SQL ausführen:**
```sql
-- 1. Companies Tabelle
CREATE TABLE companies (
  -- siehe Datenbank-Schema oben
);

-- 2. User Profiles Tabelle
CREATE TABLE user_profiles (
  -- siehe Datenbank-Schema oben
);

-- 3. RLS deaktivieren für Development
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
```

### 5. Development Server starten
```bash
npm run dev
```

→ Öffnen Sie http://localhost:3000

### 6. Erste Firma registrieren
1. Gehen Sie zu http://localhost:3000
2. Sie werden zu `/login` weitergeleitet
3. Klicken Sie "Neue Firma registrieren"
4. Füllen Sie das Formular aus
5. Nach Registrierung landen Sie auf dem Dashboard

---

## 🐛 Bekannte Probleme

### 1. RLS Policies deaktiviert
**Problem:** Row Level Security ist aktuell komplett deaktiviert
**Impact:** In Produktion könnten alle User alle Daten sehen
**Status:** ⚠️ Für Development OK, muss vor Production aktiviert werden
**Lösung:** RLS Policies implementieren basierend auf `company_id`

### 2. Keine Email-Bestätigung
**Problem:** User können sich ohne Email-Bestätigung registrieren
**Impact:** Fake-Accounts möglich
**Status:** 🚧 Für MVP OK
**Lösung:** Supabase Email-Confirmation aktivieren

### 3. Keine Passwort-Reset-Funktion
**Problem:** User können Passwort nicht zurücksetzen
**Impact:** Support-Aufwand bei vergessenen Passwörtern
**Status:** 🚧 Todo
**Lösung:** "Passwort vergessen" Flow implementieren

### 4. Keine Fehler-Seiten
**Problem:** Keine 404 oder 500 Error Pages
**Impact:** Schlechte UX bei Fehlern
**Status:** 🚧 Todo
**Lösung:** Custom Error Pages erstellen

### 5. Keine Loading-States bei langsamen Verbindungen
**Problem:** Bei langsamer Internet-Verbindung keine Feedback
**Impact:** User denken die App ist kaputt
**Status:** 🚧 Todo
**Lösung:** Skeleton Loaders oder Spinner hinzufügen

### 6. Browser-Cache-Probleme
**Problem:** Bei Änderungen am Code muss manchmal `.next` gelöscht werden
**Impact:** Entwickler müssen manuell Cache löschen
**Status:** ⚠️ Known Next.js Issue
**Lösung:** `rm -rf .next && npm run dev` bei Problemen

---

## 📊 Metriken & Statistiken

### Code-Statistiken (Stand 26.11.2024)
- **Zeilen Code (geschätzt):** ~1.500 LOC
- **Komponenten:** 3 Pages, 1 Middleware
- **API Routes:** 1 (optional)
- **Datenbank-Tabellen:** 2
- **Dependencies:** 5 production, 7 development

### Features
- **Implementiert:** 6 Features
- **In Entwicklung:** 0
- **Geplant:** 10+ Features

### Test-Coverage
- **Unit Tests:** ❌ Keine
- **Integration Tests:** ❌ Keine
- **E2E Tests:** ❌ Keine
**Status:** 🚧 Testing-Framework muss noch implementiert werden

---

## 📚 Weitere Dokumentation

### Technische Docs
- Next.js 16: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- @supabase/ssr: https://supabase.com/docs/guides/auth/server-side/nextjs

### Projekt-spezifische Docs (im Repo)
- `README.md` - Projekt-Übersicht
- `GIT-COMMIT-GUIDE.md` - Git Workflow
- `TROUBLESHOOTING.md` - Fehlerbehandlung
- `complete-cleanup-and-setup.sql` - Datenbank Setup
- Alle generierten Dateien in `/mnt/user-data/outputs/`

---

## 👨‍💻 Entwickler-Notizen

### Best Practices
1. Immer `.env.local` in `.gitignore`
2. Bei Änderungen am Schema: Migration-Script erstellen
3. Vor großen Änderungen: Git Commit
4. Bei Cache-Problemen: `rm -rf .next`
5. Console-Logs für Debugging nutzen (✅, ❌, 🔍 Emojis)

### Coding-Konventionen
- TypeScript für alle neuen Files
- Client Components: `'use client'` am Anfang
- Async/Await statt Promises
- Error-Handling mit try/catch
- Console-Logging mit Emoji-Präfix

### Git-Workflow
```bash
# Feature Branch
git checkout -b feature/mitarbeiterverwaltung

# Entwickeln...

# Committen
git add .
git commit -m "feat: add employee management"

# Pushen
git push origin feature/mitarbeiterverwaltung

# Merge via Pull Request
```

---

## ✅ Abnahme-Checkliste (Phase 1)

- [x] User kann Firma registrieren
- [x] User kann sich einloggen
- [x] User kann sich ausloggen
- [x] Dashboard zeigt Firmenname
- [x] Dashboard zeigt Username
- [x] Dashboard zeigt Admin-Badge
- [x] Dashboard zeigt Unternehmensdaten-Kachel (nur Admin)
- [x] Dashboard zeigt Firmeninformations-Box
- [x] Middleware schützt geschützte Routen
- [x] Duplikat-Firmennamen werden abgelehnt
- [x] User ohne Profil werden beim Login abgewiesen
- [x] Datenbank-Schema ist korrekt implementiert
- [x] Git Repository ist initialisiert
- [x] Environment Variables sind dokumentiert
- [x] README existiert
- [x] Code ist in TypeScript
- [x] Tailwind CSS für Styling

**Phase 1: ✅ ABGESCHLOSSEN**

---

## 📞 Support & Kontakt

**Entwickler:** Martin Ditscherlein
**Projekt:** Projektzeiterfassung v1.0
**Repository:** TBD
**Letzte Aktualisierung:** 26. November 2024

---

**Ende der Dokumentation - Version 1.0**