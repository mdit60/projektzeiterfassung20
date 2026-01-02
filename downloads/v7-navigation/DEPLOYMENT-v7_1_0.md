# V7 Navigation - Deployment Anleitung

**Version:** v7.1.0  
**Datum:** 02. Januar 2026

---

## Neue Dateistruktur

```
src/app/
├── page.tsx                           # NEU: Landing Page (Redirect)
├── login/
│   └── page.tsx                       # Bestehend (unverändert)
├── dashboard/
│   └── page.tsx                       # Bestehend V6 (unverändert)
│
└── v7/
    ├── page.tsx                       # ALT: Kann entfernt werden (wird ersetzt)
    │
    ├── berater/
    │   ├── page.tsx                   # NEU: Berater-Dashboard (2 Kacheln)
    │   │
    │   ├── foerderung/
    │   │   ├── page.tsx               # NEU: Förderberatung Firmenübersicht
    │   │   ├── import/
    │   │   │   └── page.tsx           # NEU: ZIM-Import (kopiert von v7/import)
    │   │   └── firma/
    │   │       └── [id]/
    │   │           └── page.tsx       # SPÄTER: Firmen-Detail
    │   │
    │   └── fzul/
    │       ├── page.tsx               # NEU: FZul-Beratung Firmenauswahl
    │       └── firma/
    │           └── [id]/
    │               └── page.tsx       # SPÄTER: FZul-Editor (V6-Kopie)
    │
    └── firma/
        ├── page.tsx                   # NEU: Firmen-Dashboard (Projektleiter/MA)
        ├── unternehmen/
        │   └── page.tsx               # SPÄTER
        ├── projekte/
        │   └── page.tsx               # SPÄTER
        ├── mitarbeiter/
        │   └── page.tsx               # SPÄTER
        ├── zeiterfassung/
        │   └── page.tsx               # SPÄTER
        └── berichte/
            └── page.tsx               # SPÄTER
```

---

## Deployment-Schritte

### 1. Neue Dateien kopieren

```bash
cd ~/Documents/Dev/PZE

# Landing Page (ersetzt bisherige Startseite)
cp ~/Downloads/app-page.tsx src/app/page.tsx

# Berater-Dashboard
mkdir -p src/app/v7/berater
cp ~/Downloads/berater-page.tsx src/app/v7/berater/page.tsx

# Förderberatung
mkdir -p src/app/v7/berater/foerderung
cp ~/Downloads/foerderung-page.tsx src/app/v7/berater/foerderung/page.tsx

# Förderberatung Import
mkdir -p src/app/v7/berater/foerderung/import
cp ~/Downloads/foerderung-import-page.tsx src/app/v7/berater/foerderung/import/page.tsx

# FZul-Beratung
mkdir -p src/app/v7/berater/fzul
cp ~/Downloads/fzul-page.tsx src/app/v7/berater/fzul/page.tsx

# Firmen-Dashboard
mkdir -p src/app/v7/firma
cp ~/Downloads/firma-page.tsx src/app/v7/firma/page.tsx
```

### 2. Git Commit

```bash
git add .
git commit -m "v7.1.0: Neue rollenbasierte Navigation

- Landing Page mit Auth-Check und Rollen-Redirect
- Berater-Dashboard mit Kacheln Förderberatung/FZul-Beratung  
- Förderberatung: Firmenübersicht + Import
- FZul-Beratung: Firmenauswahl (Platzhalter für V6-Kopie)
- Firmen-Dashboard: Projektleiter/Mitarbeiter-Ansicht (Platzhalter)

URL-Struktur:
- / → Login oder Redirect nach Rolle
- /v7/berater → Berater-Dashboard
- /v7/berater/foerderung → Förderberatung
- /v7/berater/fzul → FZul-Beratung
- /v7/firma → Firmen-Portal"

git push origin v7-dev
```

---

## Rollen-Logik

| Rolle | Nach Login → | Dashboard |
|-------|--------------|-----------|
| `system_admin` | `/v7/berater` | Berater-Dashboard |
| `consultant` | `/v7/berater` | Berater-Dashboard |
| `project_leader` | `/v7/firma` | Firmen-Dashboard (alle Bereiche) |
| `client_admin` | `/v7/firma` | Firmen-Dashboard (alle Bereiche) |
| `employee` | `/v7/firma` | Firmen-Dashboard (nur Zeiterfassung) |
| `client_user` | `/v7/firma` | Firmen-Dashboard (nur Zeiterfassung) |
| Kein V7-Profil | `/dashboard` | V6-Fallback |

---

## Nächste Schritte

1. **FZul-Beratung ausbauen:**
   - V6 FZul-Editor nach `/v7/berater/fzul/firma/[id]/` kopieren
   - V6 Import nach `/v7/berater/fzul/firma/[id]/import/` kopieren
   - V6 Archiv nach `/v7/berater/fzul/firma/[id]/archiv/` kopieren

2. **Firmen-Detail-Seiten:**
   - `/v7/berater/foerderung/firma/[id]/` - Projekte, MA, Arbeitspakete

3. **Firma-Bereich ausbauen:**
   - Zeiterfassung implementieren
   - Berichte implementieren

---

## Dateien in diesem Paket

| Datei | Ziel |
|-------|------|
| `app-page.tsx` | `src/app/page.tsx` |
| `berater-page.tsx` | `src/app/v7/berater/page.tsx` |
| `foerderung-page.tsx` | `src/app/v7/berater/foerderung/page.tsx` |
| `foerderung-import-page.tsx` | `src/app/v7/berater/foerderung/import/page.tsx` |
| `fzul-page.tsx` | `src/app/v7/berater/fzul/page.tsx` |
| `firma-page.tsx` | `src/app/v7/firma/page.tsx` |

---

**Erstellt:** 02. Januar 2026  
**Autor:** Claude AI / Martin Ditscherlein
