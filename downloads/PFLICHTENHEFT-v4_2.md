# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.2  
**Stand:** 02. Januar 2026  
**Projekt:** Cubintec GmbH - Projektzeiterfassung  

---

## 1. Projektübersicht

### 1.1 Zielsetzung

Webbasierte Anwendung zur Erfassung und Verwaltung von Projektstunden für:
- **Öffentlich geförderte FuE-Projekte** (ZIM, BMBF/KMU-innovativ)
- **Forschungszulage** (§35a EStG)

### 1.2 Architektur

| Komponente | Technologie |
|------------|-------------|
| Frontend | Next.js 15.5.9 |
| Backend | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Auth | Supabase Auth |

### 1.3 Zwei-Versionen-Strategie

| Version | Status | Beschreibung |
|---------|--------|--------------|
| **V6** | Produktion | FZul-Editor, Import, Analyse - stabil |
| **V7** | Entwicklung | Berater-Portal mit Firmen-Hierarchie |

---

## 2. V7 Navigation (NEU v7.1.1)

### 2.1 Rollenbasiertes Routing

```
Login (/)
    │
    ├── Berater/Admin ──────► /v7/berater (Berater-Dashboard)
    │                              │
    │                              ├── /v7/berater/foerderung (Förderberatung)
    │                              │       └── /firma/[id] (Firmen-Detail)
    │                              │
    │                              └── /v7/berater/fzul (FZul-Beratung)
    │                                      └── /firma/[id] (FZul-Editor)
    │
    ├── Projektleiter ──────► /v7/firma (Firmen-Dashboard - alle Bereiche)
    │
    ├── Mitarbeiter ────────► /v7/firma (nur Zeiterfassung)
    │
    └── Kein V7-Profil ─────► /dashboard (V6 Fallback)
```

### 2.2 Rollen in v7_user_profiles

| Rolle | Redirect | Zugriff |
|-------|----------|---------|
| `system_admin` | `/v7/berater` | Alles |
| `consultant` | `/v7/berater` | Eigene Kunden |
| `project_leader` / `client_admin` | `/v7/firma` | Eigene Firma (alle Bereiche) |
| `employee` / `client_user` | `/v7/firma` | Nur eigene Zeiterfassung |

### 2.3 URL-Struktur V7

```
/v7/berater/                    # Berater-Dashboard (2 Kacheln)
/v7/berater/foerderung/         # Förderberatung - Firmenübersicht
/v7/berater/foerderung/import/  # ZIM-Import
/v7/berater/foerderung/firma/[id]/  # (geplant) Firmen-Detail
/v7/berater/fzul/               # FZul-Beratung - Firmenauswahl
/v7/berater/fzul/firma/[id]/    # (geplant) FZul-Editor

/v7/firma/                      # Firmen-Dashboard
/v7/firma/zeiterfassung/        # (geplant) Zeiterfassung
/v7/firma/projekte/             # (geplant) Projekte
/v7/firma/mitarbeiter/          # (geplant) Mitarbeiter
/v7/firma/berichte/             # (geplant) Berichte
```

### 2.4 Dashboard-Statistiken

Das Berater-Dashboard zeigt:
- Anzahl betreuter Kunden
- Anzahl Förderprojekte (ZIM, BMBF)
- Anzahl FZul-Projekte

---

## 3. V7 Datenmodell

### 3.1 Kern-Tabellen

```
v7_consultant_companies     # Berater-Firmen
v7_client_companies         # Kunden-Firmen (gehören zu Berater)
v7_user_profiles            # Benutzer mit Rollen
v7_projects                 # Projekte (gehören zu Kunde)
v7_employees                # Mitarbeiter (gehören zu Kunde)
v7_project_assignments      # MA-Projekt-Zuordnungen
```

### 3.2 Arbeitspakete-Tabellen (v7.0.4)

```
v7_work_packages            # Arbeitspakete aus ZIM-Antrag
v7_work_package_assignments # MA-Zuordnung zu Arbeitspaketen
v7_project_budget           # Budget pro Jahr
```

### 3.3 Hierarchie

```
Berater-Firma (v7_consultant_companies)
    │
    └── Kunden-Firmen (v7_client_companies)
            │
            ├── Projekte (v7_projects)
            │       │
            │       ├── Arbeitspakete (v7_work_packages)
            │       └── Budget (v7_project_budget)
            │
            └── Mitarbeiter (v7_employees)
                    │
                    └── Zuordnungen (v7_project_assignments)
```

---

## 4. V7 ZIM-Import

### 4.1 Workflow

1. **Lokal:** Python-Script `parse-zim-pdf.py` ausführen
2. **Output:** JSON-Datei im gleichen Verzeichnis
3. **Browser:** JSON-Datei in Import-Seite laden
4. **Vorschau:** Daten prüfen
5. **Import:** In Datenbank speichern

### 4.2 Python-Script Verwendung

```bash
cd ~/Documents/Dev/PZE/downloads
python3 parse-zim-pdf.py /pfad/zum/zim-antrag.pdf
```

### 4.3 Extrahierte Daten

- Projekt (Name, FKZ, Laufzeit, Förderquote)
- Antragsteller (Firma, Adresse, Ansprechpartner)
- Mitarbeiter (Anlage 6.1 + 6.2)
- Arbeitspakete (Anlage 5)
- Budget (Personalkosten pro Jahr)

---

## 5. V6 FZul-Editor (Produktion)

### 5.1 Funktionen

- Mitarbeiter-Auswahl mit Jahresfilter
- FZul-Vorhaben-Daten (einmalig pro Firma)
- Tagesweise Stundenerfassung
- Abwesenheiten (U=Urlaub, K=Krank)
- BMF-konformes Layout
- Excel- und PDF-Export

### 5.2 Tastatursteuerung

| Taste | Funktion |
|-------|----------|
| Tab | Nächste Zelle rechts |
| Enter | Gleicher Tag im nächsten Monat |
| Pfeiltasten | Navigation |
| Delete | Zellwert auf 0 |
| Escape | Bearbeitung abbrechen |

---

## 6. Deployment

### 6.1 Branches

| Branch | URL | Zweck |
|--------|-----|-------|
| `main` | projektzeiterfassung20.vercel.app | Produktion (V6) |
| `v7-dev` | projektzeiterfassung20-git-v7-dev-... | Entwicklung (V7) |

### 6.2 Git-Workflow

```bash
# Entwicklung auf v7-dev
git checkout v7-dev
git add .
git commit -m "v7.x.x: Beschreibung"
git push origin v7-dev

# Nach stabilem Release -> main mergen
git checkout main
git merge v7-dev
git push origin main
```

---

## 7. Dateistruktur V7

```
src/app/
├── login/
│   └── page.tsx              # Login mit Rollen-Redirect
├── dashboard/
│   └── page.tsx              # V6 Dashboard (Fallback)
│
└── v7/
    ├── layout.tsx            # Minimales Layout (leer)
    │
    ├── berater/
    │   ├── page.tsx          # Berater-Dashboard
    │   │
    │   ├── foerderung/
    │   │   ├── page.tsx      # Firmenübersicht
    │   │   └── import/
    │   │       └── page.tsx  # ZIM-Import
    │   │
    │   └── fzul/
    │       └── page.tsx      # Firmenauswahl
    │
    └── firma/
        └── page.tsx          # Firmen-Dashboard (Platzhalter)
```

---

## 8. Bekannte Einschränkungen

### V7 (Entwicklung)

1. **PDF-Direktimport funktioniert nicht** - Workaround: Python-Script + JSON
2. **RLS deaktiviert** - nur für Entwicklung
3. **Firmen-Detailseite fehlt** - nach Klick auf Firma
4. **FZul-Editor fehlt** - V6-Kopie ausstehend
5. **Zeiterfassung fehlt** - noch nicht implementiert
6. **Firma löschen/archivieren** - Funktion fehlt

### V6 (Produktion)

1. MA-Stammdaten nicht firmen-spezifisch
2. Keine Firmen-Hierarchie
3. Nur ein FZul-Vorhaben pro Firma

---

## 9. Versions-Historie

| Version | Datum | Änderungen |
|---------|-------|------------|
| **v7.1.1** | 02.01.2026 | Rollenbasierte Navigation, Login-Redirect, aufgeräumtes Dashboard |
| v7.0.4 | 30.12.2024 | Arbeitspakete-Schema, Python PDF-Parser |
| v7.0.2 | 30.12.2024 | Import erweitert um Arbeitspakete/Budget |
| v7.0.1 | 30.12.2024 | ZIM-PDF-Import funktioniert |
| v7.0.0 | 27.12.2024 | Berater-Portal Grundstruktur |
| v6.7.16 | 20.12.2024 | FZul-Vorhaben persistent |

---

## 10. Nächste Schritte

### Phase 1 - Navigation (✅ erledigt v7.1.1)
- [x] Login mit Rollen-Redirect
- [x] Berater-Dashboard mit 2 Kacheln
- [x] Aufgeräumtes UI (ein Header)
- [x] Statistiken auf Dashboard

### Phase 2 - Förderberatung ausbauen
- [ ] Firmen-Detailseite (`/v7/berater/foerderung/firma/[id]`)
- [ ] Projekte anzeigen/bearbeiten
- [ ] Mitarbeiter verwalten
- [ ] Arbeitspakete-Übersicht

### Phase 3 - FZul-Beratung
- [ ] V6 FZul-Editor nach V7 kopieren
- [ ] V6 Import nach V7 kopieren
- [ ] V6 Archiv nach V7 kopieren

### Phase 4 - Firmen-Portal
- [ ] Zeiterfassung für Mitarbeiter
- [ ] Projektübersicht für Projektleiter
- [ ] Berichte

### Phase 5 - Produktion
- [ ] RLS-Policies aktivieren
- [ ] DSGVO-konforme Autorisierung
- [ ] V7 nach main mergen

---

**Erstellt:** 02. Januar 2026  
**Autor:** Claude AI / Martin Ditscherlein
