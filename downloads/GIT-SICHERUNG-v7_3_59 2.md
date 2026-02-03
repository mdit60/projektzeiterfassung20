# GIT-SICHERUNG V7.3.59

**Datum:** 21. Januar 2026  
**Branch:** v7-dev  
**Status:** Rollenbasierte Ansichten + Suspense Fix

---

## Aenderungen in diesem Release

### 1. Suspense Fix (Next.js 15)
- `useSearchParams()` muss in Suspense Boundary gewrapped sein
- Betrifft: Firma-Zeiterfassung, Berater-Zeiterfassung
- Ohne Fix: Vercel Build schlaegt fehl

### 2. Rollenbasierte Ansichten (Firmen-Portal)

| Rolle | Dashboard | Navigation | Zeiterfassung |
|-------|-----------|------------|---------------|
| client_admin | Alle Projekte | Voll | Alle MA |
| project_leader | Meine Projekte | Projekte, Zeit | Projekt-MA |
| employee | Zeiterfassung | Nur Zeit | Nur eigene |

### 3. Dateien

| Datei | Zeilen | Pfad |
|-------|--------|------|
| v7-firma-dashboard-v7_3_59.tsx | 581 | /v7/firma/dashboard/page.tsx |
| page-firma-zeiterfassung-v7_3_59.tsx | 433 | /v7/firma/zeiterfassung/page.tsx |
| page-berater-zeiterfassung-v7_3_59.tsx | 286 | /v7/berater/.../zeiterfassung/page.tsx |

---

## Git-Befehle

```bash
cd ~/Documents/Dev/PZE

# Status pruefen
git status

# Alle Aenderungen hinzufuegen
git add .

# Commit
git commit -m "v7.3.59: Rollenbasierte Ansichten + Suspense Fix

- FIX: useSearchParams() in Suspense Boundary (Next.js 15)
- Dashboard: Unterschiedliche Ansicht je nach Rolle
- Navigation: Eingeschraenkt fuer project_leader/employee
- Zeiterfassung: MA sehen nur eigene, PL sehen Projekt-MA
- client_admin: Voller Zugriff wie bisher"

# Push
git push origin v7-dev
```

---

## Vercel Deployment

Nach Push automatisch, oder manuell:
```bash
vercel --prod
```

---

## Naechste Schritte

1. Test mit verschiedenen Rollen (MA setzen mit portal_role)
2. Projekte-Seite ebenfalls rollenbasiert machen
3. FZul-Analyse (Phase 4)

---

*Erstellt: 21. Januar 2026*
