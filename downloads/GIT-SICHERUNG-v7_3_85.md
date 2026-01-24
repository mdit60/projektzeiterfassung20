# Git-Sicherung v7.3.85
## Datum: 24. Januar 2026

---

## Schnellbefehle

```bash
cd ~/Documents/Dev/PZE/pze-v7

# Status prüfen
git status

# Alle Änderungen stagen
git add -A

# Commit
git commit -m "v7.3.85: WorkPackageTable, Login-Fix, ENUM-Erweiterung

NEUE FEATURES:
- WorkPackageTable: Excel-Style Arbeitsplan mit Inline-Edit
- Sticky AP-Spalte beim horizontalen Scrollen
- Datumsformat TT.MM.JJ mit Auto-Formatierung (nur Zahlen eingeben)
- MA-Namen unterscheidbar (M. Dührkop / T. Dührkop)
- AP-Sortierung: AP1 → AP1.1 → AP1.2 → AP2
- Projektspezifische MA-Nummern im Team-Tab editierbar

LOGIN & USER-MANAGEMENT:
- Login-Verknüpfung funktioniert jetzt korrekt
- Auto-Profil-Erstellung beim ersten Login
- E-Mail fehlt Badge wieder sichtbar
- ENUM-Mapping: employee → client_user

BUGFIXES:
- 404-Fehler bei /v7/berater/dashboard behoben
- PortalHeader: Dashboard-Link entfernt, Förderung als Start
- Supabase Import gefixt (@/lib/supabase/client)

DATENBANK:
- v7_funding_format ENUM erweitert: ZIM_DS, ZIM_NETZWERK, ZIM_KOOP, ZIM_EINZEL
- employee_number in v7_project_assignments (Migration)

DATEIEN:
- components/shared/WorkPackageTable.tsx (NEU)
- components/shared/ProjectDetailPage.tsx
- components/shared/EmployeeManagement.tsx
- components/shared/PortalHeader.tsx
- app/login/page.tsx
- app/v7/firma/dashboard/page.tsx"

# Push zu GitHub (triggert Vercel Deploy)
git push origin main

# Oder falls du auf v7-dev Branch arbeitest:
# git push origin v7-dev
```

---

## Änderungsübersicht

### Neue/Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `components/shared/WorkPackageTable.tsx` | NEU - Excel-Style Arbeitsplan |
| `components/shared/ProjectDetailPage.tsx` | WorkPackageTable integriert, Datum-Handler |
| `components/shared/EmployeeManagement.tsx` | Login-Verknüpfung Fix, E-Mail fehlt Badge |
| `components/shared/PortalHeader.tsx` | Dashboard-Link entfernt, Import gefixt |
| `app/login/page.tsx` | Auto-Profil-Erstellung |
| `app/v7/firma/dashboard/page.tsx` | Berater-Redirect gefixt |

### Datenbank-Änderungen

```sql
-- ENUM erweitert (bereits ausgeführt)
ALTER TYPE v7_funding_format ADD VALUE 'ZIM_DS';
ALTER TYPE v7_funding_format ADD VALUE 'ZIM_NETZWERK';
ALTER TYPE v7_funding_format ADD VALUE 'ZIM_KOOP';
ALTER TYPE v7_funding_format ADD VALUE 'ZIM_EINZEL';

-- Migration (falls noch nicht ausgeführt)
-- migration-v7_3_85-employee-number.sql
ALTER TABLE v7_project_assignments 
ADD COLUMN IF NOT EXISTS employee_number INTEGER;
```

---

## Nach dem Push

1. **Vercel Dashboard prüfen**: https://vercel.com/dashboard
2. **Build-Log beobachten** auf Fehler
3. **Live-Test** auf der Vercel-URL

---

## Rollback (falls nötig)

```bash
# Letzten Commit rückgängig (lokal)
git reset --soft HEAD~1

# Oder zu einem bestimmten Commit zurück
git log --oneline -10  # Zeigt letzte 10 Commits
git reset --hard <commit-hash>

# Force Push (Vorsicht!)
git push origin main --force
```
