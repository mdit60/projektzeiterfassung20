# Projektzeiterfassung v1.2 - Vollständige Dateiliste

**Stand:** 28. November 2024
**Version:** 1.2

---

## 📦 Übersicht

| Kategorie | Anzahl |
|-----------|--------|
| Pages | 10 |
| API Routes | 6 |
| Lib Files | 2 |
| Config Files | 5 |
| SQL Scripts | 3 |
| Dokumentation | 4 |

---

## 🖥️ Application Files

### Pages (src/app/)

#### 1. Root & Layout
| Datei | Pfad | Beschreibung |
|-------|------|--------------|
| `page.tsx` | `src/app/page.tsx` | Root - Redirect Logic |
| `layout.tsx` | `src/app/layout.tsx` | Root Layout mit Fonts |
| `globals.css` | `src/app/globals.css` | Tailwind Globals |

#### 2. Authentifizierung
| Datei | Pfad | Status | Features |
|-------|------|--------|----------|
| `page.tsx` | `src/app/login/page.tsx` | ✅ v1.1 | Email-Vorausfüllung, is_active Check |
| `page.tsx` | `src/app/register/page.tsx` | ✅ v1.2 | Zwei-Schritt-Registrierung |

#### 3. Dashboard
| Datei | Pfad | Status | Features |
|-------|------|--------|----------|
| `page.tsx` | `src/app/dashboard/page.tsx` | ✅ v1.0 | 6 Kacheln, Firmeninfo, Admin-Badge |

#### 4. Mitarbeiterverwaltung
| Datei | Pfad | Status | Features |
|-------|------|--------|----------|
| `page.tsx` | `src/app/mitarbeiter/page.tsx` | ✅ v1.1 | Liste, Einladen, Actions (Bearbeiten, Deaktivieren, Löschen) |
| `page.tsx` | `src/app/mitarbeiter/detail/page.tsx` | ✅ v1.1 | Erweiterte Profildaten, Bearbeiten |

#### 5. Projektverwaltung
| Datei | Pfad | Status | Features |
|-------|------|--------|----------|
| `page.tsx` | `src/app/projekte/page.tsx` | ✅ v1.1 | Grid, Erstellen-Modal, Status-Badges |
| `page.tsx` | `src/app/projekte/[id]/page.tsx` | ✅ v1.2 | AP-CRUD, MA-Zuordnung, Statistiken |

#### 6. Zeiterfassung
| Datei | Pfad | Status | Features |
|-------|------|--------|----------|
| `page.tsx` | `src/app/zeiterfassung/page.tsx` | ✅ v1.2 | Excel-Matrix, Monatsansicht, Speichern |

---

### API Routes (src/app/api/)

#### Mitarbeiter-Verwaltung
| Datei | Pfad | Methode | Beschreibung |
|-------|------|---------|--------------|
| `route.ts` | `src/app/api/employees/create/route.ts` | POST | Neuen MA erstellen (ohne Admin-Logout) |
| `route.ts` | `src/app/api/employees/activate/route.ts` | POST | MA aktivieren |
| `route.ts` | `src/app/api/employees/deactivate/route.ts` | POST | MA deaktivieren |
| `route.ts` | `src/app/api/employees/delete/route.ts` | POST | MA löschen (mit Prüfung) |
| `route.ts` | `src/app/api/employees/anonymize/route.ts` | POST | MA anonymisieren (DSGVO) |

#### Zeiterfassung
| Datei | Pfad | Methode | Beschreibung |
|-------|------|---------|--------------|
| `route.ts` | `src/app/api/time-entries/route.ts` | GET/POST | Zeiteinträge laden/erstellen |

---

### Library Files (src/lib/)

| Datei | Pfad | Beschreibung |
|-------|------|--------------|
| `client.ts` | `src/lib/supabase/client.ts` | Browser Supabase Client |
| `server.ts` | `src/lib/supabase/server.ts` | Server Supabase Client |

---

### Middleware

| Datei | Pfad | Beschreibung |
|-------|------|--------------|
| `middleware.ts` | `src/middleware.ts` | Route Protection, Auth Check |

---

## ⚙️ Configuration Files

| Datei | Beschreibung |
|-------|--------------|
| `.env.local` | Environment Variables (nicht in Git!) |
| `package.json` | Dependencies & Scripts |
| `tsconfig.json` | TypeScript Config |
| `tailwind.config.ts` | Tailwind CSS Config |
| `next.config.ts` | Next.js Config |
| `postcss.config.mjs` | PostCSS Config |

---

## 🗄️ SQL Scripts

| Datei | Beschreibung | Status |
|-------|--------------|--------|
| `complete-cleanup-and-setup.sql` | Basis-Schema (Companies, Profiles, Projects) | ✅ |
| `zeiterfassung-schema.sql` | Time Entries, Work Packages, Holidays | ✅ |
| `datenbank-safe-delete.sql` | Soft Delete, Anonymisierung, can_delete_employee() | ✅ |

---

## 📚 Dokumentation

| Datei | Beschreibung | Version |
|-------|--------------|---------|
| `PFLICHTENHEFT-v1_2.md` | Vollständige Projektdokumentation | 1.2 |
| `DATEILISTE-v1_2.md` | Diese Datei | 1.2 |
| `PHASE-4-ZEITERFASSUNG-KONZEPT.md` | Konzept für Zeiterfassungs-Modul | 1.2 |
| `README.md` | Projekt-Übersicht | 1.0 |

---

## 🗂️ Vollständige Verzeichnisstruktur

```
projektzeiterfassung20/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   │
│   │   ├── login/
│   │   │   └── page.tsx
│   │   │
│   │   ├── register/
│   │   │   └── page.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   │
│   │   ├── mitarbeiter/
│   │   │   ├── page.tsx
│   │   │   └── detail/
│   │   │       └── page.tsx
│   │   │
│   │   ├── projekte/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── zeiterfassung/
│   │   │   └── page.tsx
│   │   │
│   │   ├── einstellungen/
│   │   │   └── page.tsx          # 🚧 Geplant
│   │   │
│   │   ├── berichte/
│   │   │   └── page.tsx          # 🚧 Geplant
│   │   │
│   │   ├── arbeitsplaene/
│   │   │   └── page.tsx          # 🚧 Geplant
│   │   │
│   │   └── api/
│   │       ├── employees/
│   │       │   ├── create/
│   │       │   │   └── route.ts
│   │       │   ├── activate/
│   │       │   │   └── route.ts
│   │       │   ├── deactivate/
│   │       │   │   └── route.ts
│   │       │   ├── delete/
│   │       │   │   └── route.ts
│   │       │   └── anonymize/
│   │       │       └── route.ts
│   │       │
│   │       └── time-entries/
│   │           └── route.ts
│   │
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── server.ts
│   │
│   └── middleware.ts
│
├── public/
│   └── favicon.ico
│
├── docs/
│   ├── PFLICHTENHEFT-v1_2.md
│   ├── DATEILISTE-v1_2.md
│   ├── PHASE-4-ZEITERFASSUNG-KONZEPT.md
│   └── sql/
│       ├── complete-cleanup-and-setup.sql
│       ├── zeiterfassung-schema.sql
│       └── datenbank-safe-delete.sql
│
├── .env.local
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── next.config.ts
```

---

## 🔑 Wichtige IDs (Testumgebung)

### Firmen
| Firma | Company ID | Status |
|-------|------------|--------|
| Cubintec | `4f20d4bc-588d-4291-bc0b-995943533829` | Test |
| Alacsystems | `4eb7e15c-ff55-40f2-b307-a32f31b0c460` | Validierung |

### Projekte
| Projekt | Project ID | Firma |
|---------|------------|-------|
| VETIS | `389d8eaa-1fe9-4420-9fd5-b0ab7984dd02` | Alacsystems |

### Arbeitspakete (VETIS)
| Code | Beschreibung |
|------|--------------|
| AP1 | Definition der gemeinsamen Anforderungen |
| AP2 | Entwicklung des mechanischen Steckersystems |
| AP2.1 | Auswahl des optimalen Sensorknoten |
| AP2.2 | Entwicklung eines Dichtungssystems |
| AP2.3 | Entwicklung Integration der Sensorik |
| AP2.3.1 | Analyse thermischer Anforderungen |
| AP2.3.2 | Integration von Temperatursensorik |
| AP2.4 | Entwicklung elektrische Kopplung |
| AP2.4.1 | Materialanalyse |
| AP2.4.2 | Geometrieoptimierung |
| AP2.4.3 | Simulation & Validierung |
| AP2.5 | Prototypen und Funktionstests |
| AP3 | Entwicklung Sensorik/Elektronik |
| AP4 | Integration aller Systemelemente |
| AP5 | Systemvalidierung und Dokumentation |
| AP5.1 | Integration Systemtest |
| AP5.2 | Testdokumentation |

---

## 🚀 Quick Start Commands

```bash
# Development starten
pnpm dev

# Build für Production
pnpm build

# Production starten
pnpm start

# TypeScript Check
pnpm tsc --noEmit

# Cache löschen (bei Problemen)
rm -rf .next && pnpm dev

# Dependencies aktualisieren
pnpm update
```

---

## ✅ Installations-Checkliste

### Neue Installation
- [ ] Repository klonen
- [ ] `pnpm install`
- [ ] `.env.local` erstellen
- [ ] Supabase Projekt anlegen
- [ ] SQL Scripts ausführen (in Reihenfolge)
- [ ] `pnpm dev`
- [ ] Erste Firma registrieren

### Update von v1.1 auf v1.2
- [ ] Git pull
- [ ] `pnpm install`
- [ ] `zeiterfassung-schema.sql` ausführen
- [ ] `src/app/register/page.tsx` prüfen (muss RegisterPage sein!)
- [ ] Cache löschen: `rm -rf .next`
- [ ] `pnpm dev`

---

## 🐛 Troubleshooting

### Problem: Register leitet zu Login
**Lösung:** Prüfe ob `src/app/register/page.tsx` die Funktion `RegisterPage()` exportiert, nicht `MitarbeiterPage()`.

### Problem: TypeScript-Fehler bei project
**Lösung:** Helper-Funktion verwenden:
```typescript
const getProject = (project) => {
  if (!project) return null;
  if (Array.isArray(project)) return project[0];
  return project;
};
```

### Problem: Zeiterfassung lädt keine APs
**Lösung:** Prüfe ob `work_packages` Tabelle existiert und Daten enthält.

---

## 📅 Nächste Schritte

1. **Diese Woche:**
   - [ ] Zeiterfassung: Header mit MA-Name
   - [ ] Zeiterfassung: Nur zugeordnete APs für Employees
   - [ ] Admin-Übersicht für Zeiterfassung

2. **Nächste Woche:**
   - [ ] Jahresübersicht (FuE-Export)
   - [ ] Berichte-Seite
   - [ ] Arbeitspläne (Basis)

3. **Vor Go-Live:**
   - [ ] RLS Policies aktivieren
   - [ ] Email-Bestätigung aktivieren
   - [ ] Deployment-Dokumentation

---

**Ende der Dateiliste - Version 1.2**
