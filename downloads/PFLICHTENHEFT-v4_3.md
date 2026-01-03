# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.3  
**Stand:** 03. Januar 2026  
**Projekt:** Projektzeiterfassung für FuE-Förderung

---

## 1. Projektübersicht

### 1.1 Zielsetzung

Webbasierte SaaS-Anwendung zur Erfassung und Verwaltung von Projektstunden für:
- **Öffentlich geförderte FuE-Projekte** (ZIM, BMBF/KMU-innovativ)
- **Forschungszulage** (§35a EStG)

### 1.2 Zielgruppe

- **Beratungsunternehmen** (Consultants) - verwalten mehrere Kundenfirmen
- **Kundenfirmen** (Clients) - Projektleiter und Mitarbeiter

### 1.3 Architektur

| Komponente | Technologie |
|------------|-------------|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Hosting | Vercel |
| Auth | Supabase Auth |

### 1.4 Zwei-Versionen-Strategie

| Version | Status | Beschreibung |
|---------|--------|--------------|
| **V6** | Produktion | FZul-Editor, Import, Analyse - stabil |
| **V7** | Entwicklung | Multi-Mandanten Berater-Portal |

---

## 2. V7 Architektur

### 2.1 Multi-Mandanten-Konzept

```
┌─────────────────────────────────────────────────────────────────┐
│                    SaaS-PLATTFORM                               │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────┐          │
│  │ Beraterfirma A       │    │ Beraterfirma B       │          │
│  │ (z.B. Cubintec)      │    │ (z.B. andere)        │          │
│  │                      │    │                      │          │
│  │  ┌────┐ ┌────┐      │    │  ┌────┐ ┌────┐      │          │
│  │  │Kunde│ │Kunde│     │    │  │Kunde│ │Kunde│     │          │
│  │  │ 1  │ │ 2  │ ...  │    │  │ X  │ │ Y  │ ...  │          │
│  │  └────┘ └────┘      │    │  └────┘ └────┘      │          │
│  └──────────────────────┘    └──────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Rollen-System

| Rolle | Beschreibung | Zugriff |
|-------|--------------|---------|
| `system_admin` | System-Administrator | Alles |
| `consultant` | Berater | Eigene Kundenfirmen |
| `client_admin` | Firmen-Admin (Projektleiter) | Eigene Firma komplett |
| `client_user` | Mitarbeiter | Nur eigene Zeiterfassung |

### 2.3 Datenbank-Schema V7

```
v7_consultant_companies (Beraterfirmen)
    │
    ├── v7_client_companies (Kundenfirmen)
    │       │
    │       ├── v7_projects (Projekte)
    │       │       │
    │       │       ├── v7_work_packages (Arbeitspakete)
    │       │       │       └── v7_work_package_assignments (MA-Zuordnung)
    │       │       │
    │       │       └── v7_project_budget (Budget)
    │       │
    │       ├── v7_employees (Mitarbeiter-Stammdaten)
    │       │
    │       └── v7_timesheets / v7_fzul_timesheets (Zeiterfassung)
    │
    └── v7_user_profiles (Login-User mit Rollen)
```

---

## 3. V7 Navigation

### 3.1 URL-Struktur

```
/v7/berater/                           # Berater-Dashboard
/v7/berater/foerderung/                # Förderberatung - Firmenübersicht
/v7/berater/foerderung/firma/[id]/     # Firmen-Detailseite ✅ NEU
/v7/berater/foerderung/import/         # ZIM-Import
/v7/berater/fzul/                      # FZul-Beratung - Firmenauswahl
/v7/berater/fzul/firma/[id]/           # FZul-Editor (geplant)

/v7/firma/                             # Firmen-Dashboard (Client-Sicht)
/v7/firma/zeiterfassung/               # Zeiterfassung (geplant)
/v7/firma/projekte/                    # Projekte (geplant)
```

### 3.2 Login-Redirect

```
Login → Rollenprüfung
    │
    ├── system_admin / consultant → /v7/berater
    │
    ├── client_admin / client_user → /v7/firma
    │
    └── Kein V7-Profil → /dashboard (V6 Fallback)
```

---

## 4. Implementierungsstand

### 4.1 Erledigt ✅

| Version | Feature | Status |
|---------|---------|--------|
| v7.0.0 | Berater-Portal Grundstruktur | ✅ |
| v7.0.1 | ZIM-PDF-Import (via Python) | ✅ |
| v7.0.4 | Arbeitspakete-Schema | ✅ |
| v7.1.1 | Rollenbasierte Navigation | ✅ |
| v7.1.2 | Firmen-Detailseite | ✅ |
| v7.1.2 | v7_consultant_companies Tabelle | ✅ |
| v7.1.2 | V6→V7 Datenmigration | ✅ |

### 4.2 Firmen-Detailseite (v7.1.2)

**Pfad:** `/v7/berater/foerderung/firma/[id]/`

**Features:**
- Tab-Navigation: Übersicht | Projekte | Mitarbeiter | Arbeitspakete
- Statistik-Karten: Projekte, MA, APs, Fördervolumen
- Firmendaten-Anzeige (Name, Adresse, Kontakt, Bundesland)
- Projekt-Liste mit FKZ, Förderformat, Laufzeit
- Mitarbeiter-Tabelle mit Position, Wochenstunden, Status
- Arbeitspakete gruppiert nach Projekt

**Datenquellen:**
- `v7_client_companies` - Firmendaten
- `v7_projects` - Projekte
- `v7_employees` - Mitarbeiter
- `v7_work_packages` - Arbeitspakete
- `v7_project_budget` - Budget-Infos

---

## 5. Offene Punkte

### 5.1 Phase 2 - Daten bearbeiten (NÄCHSTE PRIORITÄT)

| Feature | Beschreibung | Status |
|---------|--------------|--------|
| Firma bearbeiten | Stammdaten ändern | ⏳ |
| Firma anlegen | Neue Kundenfirma erstellen | ⏳ |
| Projekt bearbeiten | Projektdaten ändern | ⏳ |
| Projekt anlegen | Neues Projekt erstellen | ⏳ |
| MA bearbeiten | Mitarbeiterdaten ändern | ⏳ |
| MA anlegen | Neuen Mitarbeiter erstellen | ⏳ |
| MA zu Projekt zuordnen | Projekt-Assignments | ⏳ |

### 5.2 Phase 3 - FZul-Migration

| Feature | Beschreibung | Status |
|---------|--------------|--------|
| FZul-Editor | V6→V7 Migration | ⏳ |
| FZul-Import | Excel-Import | ⏳ |
| FZul-Archiv | PDF/Excel-Archiv | ⏳ |

### 5.3 Phase 4 - Firmen-Portal

| Feature | Beschreibung | Status |
|---------|--------------|--------|
| Firmen-Dashboard | Client-Sicht | ⏳ |
| Zeiterfassung | MA erfassen Stunden | ⏳ |
| Berichte | Export für Projektleiter | ⏳ |

### 5.4 Phase 5 - Produktion

| Feature | Beschreibung | Status |
|---------|--------------|--------|
| RLS aktivieren | Row Level Security | ⏳ |
| DSGVO-Autorisierung | Berater-Zugriff durch GF | ⏳ |
| Multi-Mandanten | Weitere Beraterfirmen | ⏳ |

---

## 6. Dateistruktur V7

```
src/app/v7/
├── berater/
│   ├── page.tsx                    # Berater-Dashboard
│   ├── foerderung/
│   │   ├── page.tsx                # Firmenübersicht
│   │   ├── firma/
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Firmen-Detailseite ✅
│   │   └── import/
│   │       └── page.tsx            # ZIM-Import
│   └── fzul/
│       └── page.tsx                # FZul-Firmenauswahl
├── firma/
│   └── page.tsx                    # Firmen-Dashboard
├── layout.tsx                      # V7-Layout
└── page.tsx                        # V7-Startseite
```

---

## 7. Deployment

### 7.1 Branches

| Branch | URL | Zweck |
|--------|-----|-------|
| `main` | projektzeiterfassung20.vercel.app | Produktion (V6) |
| `v7-dev` | Preview-URL | Entwicklung (V7) |

### 7.2 Git-Tags

| Tag | Datum | Beschreibung |
|-----|-------|--------------|
| v7.1.2-dev | 03.01.2026 | Firmen-Detailseite + Migration |
| v7.1.1-dev | 02.01.2026 | Rollenbasierte Navigation |
| v6.7.16-stable | 20.12.2024 | Letzte stabile V6 |

---

## 8. Versions-Historie

| Version | Datum | Änderungen |
|---------|-------|------------|
| **v7.1.2** | 03.01.2026 | Firmen-Detailseite, v7_consultant_companies, V6→V7 Migration |
| v7.1.1 | 02.01.2026 | Rollenbasierte Navigation, Login-Redirect |
| v7.0.4 | 30.12.2024 | Arbeitspakete-Schema, Python PDF-Parser |
| v7.0.1 | 30.12.2024 | ZIM-PDF-Import funktioniert |
| v7.0.0 | 27.12.2024 | Berater-Portal Grundstruktur |
| v6.7.16 | 20.12.2024 | FZul-Vorhaben persistent |

---

## 9. Aktuelle Testdaten (V7)

Nach Migration vom 03.01.2026:

| Kategorie | Anzahl |
|-----------|--------|
| Beraterfirmen | 1 (Cubintec GmbH) |
| Kundenfirmen | 5 |
| Berater-User | 2 (Martin, Katrin) |
| Kunden-User | 17 |
| Mitarbeiter | 17 |
| Projekte | 4 |

**Kundenfirmen:**
- Alacsystems GmbH & Co. KG (6 MA, 1 Projekt)
- AS-System GmbH (1 MA, 0 Projekte)
- Automotive Synergies GmbH (5 MA, 2 Projekte)
- Stoma GmbH (4 MA, 1 Projekt)
- Tippl GmbH (1 MA, 0 Projekte)

---

**Erstellt:** 03. Januar 2026  
**Autor:** Claude AI / Martin Ditscherlein
