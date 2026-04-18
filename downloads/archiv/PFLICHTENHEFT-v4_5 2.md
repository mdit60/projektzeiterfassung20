# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.5  
**Stand:** 06. Januar 2026  
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
| Hosting Frontend | Vercel |
| **ZIM Parser Service** | **Railway.app (FastAPI/Python)** ✅ NEU |
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
│  │ (z.B. MD Business)   │    │ (z.B. andere)        │          │
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
    │       │       ├── v7_project_assignments (MA↔Projekt)
    │       │       │
    │       │       ├── v7_work_packages (Arbeitspakete)
    │       │       │       └── v7_work_package_assignments (MA↔AP mit PM)
    │       │       │
    │       │       └── v7_project_budget (Budget)
    │       │
    │       ├── v7_employees (Mitarbeiter-Stammdaten)
    │       │
    │       └── v7_timesheets / v7_fzul_timesheets (Zeiterfassung)
    │
    └── v7_user_profiles (Login-User mit Rollen)
```

### 2.4 Datenbank-Constraints (wichtig!)

| Tabelle | Constraint | Typ | Beschreibung |
|---------|------------|-----|--------------|
| v7_work_packages | v7_work_packages_unique | UNIQUE | (project_id, **ap_code**) |

**Hinweis:** Der Constraint wurde von `ap_number` auf `ap_code` geändert (v7.2.2), da AP1.1 und AP1.2 beide `ap_number=1` haben aber unterschiedliche `ap_code` Werte.

---

## 3. V7 Navigation

### 3.1 URL-Struktur

```
/v7/berater/                           # Berater-Dashboard
/v7/berater/foerderung/                # Förderberatung - Firmenübersicht
/v7/berater/foerderung/firma/[id]/     # Firmen-Detailseite ✅ v7.1.6
/v7/berater/foerderung/import/         # ZIM-Import ✅ v7.2.4
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
| v7.0.1 | ZIM-PDF-Import (via Python lokal) | ✅ |
| v7.0.4 | Arbeitspakete-Schema | ✅ |
| v7.1.1 | Rollenbasierte Navigation | ✅ |
| v7.1.2 | Firmen-Detailseite (nur Anzeige) | ✅ |
| v7.1.2 | v7_consultant_companies Tabelle | ✅ |
| v7.1.2 | V6→V7 Datenmigration | ✅ |
| v7.1.3 | Firma/Projekt/MA CRUD | ✅ |
| v7.1.4 | Arbeitspakete CRUD | ✅ |
| v7.1.5 | MA zu Projekt zuordnen | ✅ |
| v7.1.6 | MA zu AP zuordnen (mit PM) | ✅ |
| **v7.2.0** | **Import mit Arbeitspaketen + AP-Zuordnungen** | ✅ |
| **v7.2.1** | **UTF-8 Encoding Fix** | ✅ |
| **v7.2.2** | **Parser Fix: Mehrere MA pro AP** | ✅ |
| **v7.2.3** | **Automatischer Reimport** | ✅ |
| **v7.2.4** | **DIREKTER PDF-UPLOAD via Microservice** | ✅ |

### 4.2 ZIM-Import (v7.2.x) ✅ KOMPLETT

**Pfad:** `/v7/berater/foerderung/import/`

#### Import-Workflow (NEU v7.2.4)

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEUER WORKFLOW (v7.2.4)                     │
│                                                                 │
│  ┌─────────┐     ┌──────────────────────┐     ┌────────────┐   │
│  │ PDF     │────▶│ Railway Microservice │────▶│ JSON-Daten │   │
│  │ Upload  │     │ (FastAPI/Python)     │     │ im Browser │   │
│  └─────────┘     └──────────────────────┘     └────────────┘   │
│                                                      │          │
│                                                      ▼          │
│                                              ┌────────────┐     │
│                                              │ Vorschau + │     │
│                                              │ Import DB  │     │
│                                              └────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

**Vorher (v7.0.x - v7.2.0):**
1. PDF lokal mit Python-Script parsen
2. JSON-Datei erstellen
3. JSON in Web-UI hochladen
4. Import in Datenbank

**Jetzt (v7.2.4):**
1. PDF direkt in Web-UI hochladen
2. Microservice parst XFA-Daten
3. Vorschau prüfen
4. Import in Datenbank

#### Features

| Feature | Version | Beschreibung |
|---------|---------|--------------|
| PDF-Direktupload | v7.2.4 | Kein lokales Python mehr nötig |
| XFA-Parsing | v7.2.0 | Extrahiert Daten aus Adobe-Formularen |
| Multi-MA pro AP | v7.2.2 | Alle MA-Zuordnungen werden erkannt |
| Automatischer Reimport | v7.2.3 | Alte Daten werden überschrieben |
| Validierungs-Checkliste | v7.2.0 | Vollständigkeitsprüfung vor Import |
| UTF-8 Encoding | v7.2.1 | Umlaute korrekt |

#### Extrahierte Daten

| Kategorie | Felder |
|-----------|--------|
| Projekt | Name, Kurzname, FKZ, Start/Ende, Förderquote, Kosten, Zuwendung, PM |
| Antragsteller | Firma, Rechtsform, Adresse, Bundesland, Ansprechpartner |
| Mitarbeiter | Name, Qualifikation, Funktion, Jahresbrutto, Stundensatz, Wochenstunden |
| Arbeitspakete | AP-Code, Name, Start/Ende, Gesamt-PM |
| AP-Zuordnungen | MA-Nr → AP mit PM-Wert |

---

## 5. ZIM Parser Microservice

### 5.1 Übersicht

| Eigenschaft | Wert |
|-------------|------|
| **Technologie** | FastAPI (Python 3.x) |
| **Hosting** | Railway.app |
| **URL** | https://web-production-e2e1.up.railway.app |
| **Repository** | https://github.com/mdit60/zim-parser-service |

### 5.2 API Endpoints

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/` | Service-Info |
| GET | `/health` | Health Check |
| POST | `/parse` | PDF hochladen und parsen |

### 5.3 Verwendung

```bash
# Health Check
curl https://web-production-e2e1.up.railway.app/health

# PDF parsen
curl -X POST https://web-production-e2e1.up.railway.app/parse \
  -F "file=@ZIM-Antrag.pdf"
```

### 5.4 Dateien im Repository

```
zim-parser-service/
├── main.py              # FastAPI Server + Parser
├── requirements.txt     # Python Dependencies
├── Procfile             # Railway Start-Befehl
├── railway.toml         # Railway Konfiguration
├── README.md            # Dokumentation
└── .gitignore
```

### 5.5 Dependencies

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
pypdf==4.0.1
python-multipart==0.0.6
cryptography>=3.1
```

**Hinweis:** `cryptography` ist nötig für verschlüsselte/geschützte PDFs.

---

## 6. Offene Punkte

### 6.1 Phase 2 - CRUD ✅ ERLEDIGT

| Feature | Status |
|---------|--------|
| Projekt CRUD | ✅ v7.1.3 |
| MA CRUD | ✅ v7.1.3 |
| AP CRUD | ✅ v7.1.4 |
| MA → Projekt zuordnen | ✅ v7.1.5 |
| MA → AP zuordnen (PM) | ✅ v7.1.6 |

### 6.2 Phase 2b - Import ✅ ERLEDIGT

| Feature | Status |
|---------|--------|
| ZIM-PDF Import (lokal) | ✅ v7.0.1 |
| Import mit Arbeitspaketen | ✅ v7.2.0 |
| Parser Multi-MA Fix | ✅ v7.2.2 |
| Automatischer Reimport | ✅ v7.2.3 |
| **PDF-Direktupload Microservice** | ✅ v7.2.4 |

### 6.3 Phase 3 - FZul-Migration (NÄCHSTE PRIORITÄT)

| Feature | Beschreibung | Status |
|---------|--------------|--------|
| FZul-Editor | V6→V7 Migration | ⏳ |
| FZul-Import | Excel-Import | ⏳ |
| FZul-Archiv | PDF/Excel-Archiv | ⏳ |

### 6.4 Phase 4 - Firmen-Portal

| Feature | Beschreibung | Status |
|---------|--------------|--------|
| Firmen-Dashboard | Client-Sicht | ⏳ |
| Zeiterfassung | MA erfassen Stunden | ⏳ |
| Berichte | Export für Projektleiter | ⏳ |

### 6.5 Phase 5 - Produktion

| Feature | Beschreibung | Status |
|---------|--------------|--------|
| RLS aktivieren | Row Level Security | ⏳ |
| DSGVO-Autorisierung | Berater-Zugriff durch GF | ⏳ |
| Multi-Mandanten | Weitere Beraterfirmen | ⏳ |

---

## 7. Dateistruktur V7

```
src/app/v7/
├── berater/
│   ├── page.tsx                    # Berater-Dashboard
│   ├── foerderung/
│   │   ├── page.tsx                # Firmenübersicht
│   │   ├── firma/
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Firmen-Detailseite ✅ v7.1.6
│   │   └── import/
│   │       └── page.tsx            # ZIM-Import ✅ v7.2.4
│   └── fzul/
│       └── page.tsx                # FZul-Firmenauswahl
├── firma/
│   └── page.tsx                    # Firmen-Dashboard
├── layout.tsx                      # V7-Layout
└── page.tsx                        # V7-Startseite

# Externe Services
zim-parser-service/                  # Railway.app Microservice
├── main.py
├── requirements.txt
├── Procfile
└── railway.toml
```

---

## 8. Deployment

### 8.1 Branches

| Branch | URL | Zweck |
|--------|-----|-------|
| `main` | projektzeiterfassung20.vercel.app | Produktion (V6) |
| `v7-dev` | Preview-URL | Entwicklung (V7) |

### 8.2 Externe Services

| Service | Plattform | URL |
|---------|-----------|-----|
| ZIM Parser | Railway.app | https://web-production-e2e1.up.railway.app |
| Datenbank | Supabase | (projektspezifisch) |
| Frontend | Vercel | projektzeiterfassung20.vercel.app |

### 8.3 Environment Variables

```env
# .env.local (optional)
NEXT_PUBLIC_ZIM_PARSER_URL=https://web-production-e2e1.up.railway.app
```

### 8.4 Cache-Kontrolle

In `next.config.ts` sind Cache-Header für `/v7/*` deaktiviert, um bei jedem Deployment sofort die neueste Version zu sehen.

### 8.5 Git-Tags

| Tag | Datum | Beschreibung |
|-----|-------|--------------|
| **v7.2.4-dev** | 06.01.2026 | PDF-Direktupload via Microservice |
| **v7.2.3-dev** | 06.01.2026 | Automatischer Reimport |
| **v7.2.2-dev** | 06.01.2026 | Parser Fix Multi-MA, Constraint auf ap_code |
| v7.2.1-dev | 05.01.2026 | UTF-8 Encoding Fix |
| v7.2.0-dev | 05.01.2026 | Import mit Arbeitspaketen |
| v7.1.6-dev | 03.01.2026 | MA-AP-Zuordnung mit PM-Verteilung |
| v7.1.5-dev | 03.01.2026 | MA-Projekt-Zuordnung |
| v7.1.4-dev | 03.01.2026 | Arbeitspakete CRUD |
| v7.1.3-dev | 03.01.2026 | Firma/Projekt/MA CRUD |
| v7.1.2-dev | 03.01.2026 | Firmen-Detailseite + Migration |
| v7.1.1-dev | 02.01.2026 | Rollenbasierte Navigation |
| v6.7.16-stable | 20.12.2024 | Letzte stabile V6 |

---

## 9. Versions-Historie

| Version | Datum | Änderungen |
|---------|-------|------------|
| **v7.2.4** | 06.01.2026 | **PDF-Direktupload via Railway Microservice** - kein lokales Python mehr nötig |
| **v7.2.3** | 06.01.2026 | Automatischer Reimport - alte AP-Daten werden überschrieben |
| **v7.2.2** | 06.01.2026 | Parser Fix für mehrere MA pro AP, DB-Constraint auf ap_code |
| v7.2.1 | 05.01.2026 | UTF-8 Encoding Fix (fixEncoding-Funktion) |
| v7.2.0 | 05.01.2026 | Import mit Arbeitspaketen und AP-Zuordnungen |
| v7.1.6 | 03.01.2026 | MA zu AP zuordnen mit PM-Verteilung, Überbucht-Warnung |
| v7.1.5 | 03.01.2026 | MA zu Projekt zuordnen (Modal) |
| v7.1.4 | 03.01.2026 | Arbeitspakete CRUD, Auto-AP-Nummer, PM↔Stunden |
| v7.1.3 | 03.01.2026 | Projekt/MA CRUD mit Modal-Dialogen, Soft-Delete |
| v7.1.2 | 03.01.2026 | Firmen-Detailseite, v7_consultant_companies, V6→V7 Migration |
| v7.1.1 | 02.01.2026 | Rollenbasierte Navigation, Login-Redirect |
| v7.0.4 | 30.12.2024 | Arbeitspakete-Schema, Python PDF-Parser |
| v7.0.1 | 30.12.2024 | ZIM-PDF-Import funktioniert |
| v7.0.0 | 27.12.2024 | Berater-Portal Grundstruktur |
| v6.7.16 | 20.12.2024 | FZul-Vorhaben persistent |

---

## 10. Bugfixes v7.2.x (Dokumentation)

### 10.1 Parser Fix: Mehrere MA pro AP (v7.2.2)

**Problem:** 
Bei ZIM-PDFs wurden nur 10 statt 44 AP-Zuordnungen erkannt. Nur der erste MA pro AP wurde importiert.

**Ursache:**
Die PDF-Tabelle hat mehrere Zeilen pro AP:
```
| Nr. | Arbeitspaket    | MA-Nr | PM  |
| 1.1 | Konzeption...   | 1     | 0.5 |
| 1.1 | (leer)          | 2     | 0.5 |  ← wurde nicht erkannt
| 1.1 | (leer)          | 3     | 0.5 |  ← wurde nicht erkannt
```

Das XFA-Format nutzt leere Tags `<ap/>` für Fortsetzungszeilen.

**Lösung:**
1. Komplette XFA-Normalisierung: `xfa_text.replace('\n', '')`
2. Regex-Pattern mit optionalen leeren Tags: `(?:<ap>([^<]*)</ap>|<ap/>)`
3. Tracking des aktuellen AP-Codes für Fortsetzungszeilen

### 10.2 UNIQUE Constraint Fix (v7.2.2)

**Problem:**
AP1.1 und AP1.2 konnten nicht beide importiert werden - der zweite wurde übersprungen.

**Ursache:**
- Constraint: `UNIQUE (project_id, ap_number)`
- AP1.1 hat `ap_number=1`, AP1.2 auch `ap_number=1`
- Zweiter Insert schlug fehl

**Lösung:**
```sql
ALTER TABLE v7_work_packages DROP CONSTRAINT v7_work_packages_unique;
ALTER TABLE v7_work_packages ADD CONSTRAINT v7_work_packages_unique UNIQUE (project_id, ap_code);
```

### 10.3 Automatischer Reimport (v7.2.3)

**Problem:**
Beim erneuten Import desselben Projekts wurden die Daten addiert statt überschrieben.

**Lösung:**
Wenn ein Projekt mit gleichem FKZ existiert:
1. Alle AP-Zuordnungen des Projekts löschen
2. Alle Arbeitspakete des Projekts löschen
3. Alle Projekt-Zuordnungen löschen
4. Projektdaten aktualisieren
5. Neue Daten importieren

---

## 11. Technische Konstanten

| Konstante | Wert | Beschreibung |
|-----------|------|--------------|
| HOURS_PER_PM | 173.33 | Stunden pro Personenmonat (40h × 52W / 12M) |
| ZIM_PARSER_URL | https://web-production-e2e1.up.railway.app | Microservice URL |

---

**Erstellt:** 06. Januar 2026  
**Autor:** Claude AI / Martin Ditscherlein
