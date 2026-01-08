# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.6  
**Datum:** 06. Januar 2026  
**Projekt:** Projektzeiterfassung für FuE-Fördervorhaben  
**Status:** V7 Entwicklung - Phase 4 (Firmen-Portal)

---

## 1. Projektstatus Übersicht

### 1.1 Versionen

| Version | Status | Beschreibung |
|---------|--------|--------------|
| **V6** | ✅ Produktion | Stabile Version auf main-Branch |
| **V7** | 🔧 Entwicklung | Berater-Portal + Firmen-Portal auf v7-dev |

### 1.2 Aktueller Stand V7

| Komponente | Status | Version |
|------------|--------|---------|
| Berater-Portal | ✅ Funktional | v7.3.2 |
| Firmen-Portal | ✅ Grundfunktionen | v7.3.2 |
| Zeiterfassung | ⏳ Ausstehend | Sprint 2 |
| FZul-Migration | ⏳ Ausstehend | Phase 3 |

---

## 2. Architektur V7

### 2.1 Benutzer-Hierarchie

```
Berater-Firma (z.B. Cubintec GmbH)
    └── Berater (consultant)
            └── betreut mehrere Kundenfirmen
                    
Kunden-Firma (z.B. AS System GmbH)
    ├── Firmen-Admin (client_admin) - z.B. Geschäftsführer
    ├── Projektleiter (project_leader)
    └── Mitarbeiter (employee)
```

### 2.2 Rollen und Berechtigungen

| Rolle | Portal | Rechte |
|-------|--------|--------|
| `system_admin` | Berater | Vollzugriff |
| `consultant` | Berater | Alle Kundenfirmen verwalten |
| `client_admin` | Firma | Eigene Firma verwalten, alle Mitarbeiter sehen |
| `project_leader` | Firma | Projekte verwalten, Team-Zeiten sehen |
| `employee` | Firma | Nur eigene Zeiterfassung |

### 2.3 Farbschema

| Portal | Farbe | Hex-Code |
|--------|-------|----------|
| Berater-Portal | Dunkelblau | `#0369a1` |
| Firmen-Portal | Cubintec-Grün | `#65A655` |

---

## 3. Datenbank-Schema V7

### 3.1 Haupttabellen

| Tabelle | Beschreibung |
|---------|--------------|
| `v7_consultant_companies` | Beraterfirmen |
| `v7_client_companies` | Kundenfirmen |
| `v7_user_profiles` | Benutzerprofile mit Rollen |
| `v7_projects` | Förderprojekte |
| `v7_employees` | Mitarbeiter |
| `v7_work_packages` | Arbeitspakete |
| `v7_timesheets` | Zeiterfassung |
| `v7_project_assignments` | MA-Projekt-Zuordnung |
| `v7_work_package_assignments` | MA-AP-Zuordnung |

### 3.2 Neue Spalten v7.3.x

**v7_client_companies:**
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `status` | TEXT | invited, registered, active, inactive |
| `onboarding_type` | TEXT | by_consultant, self_registration |
| `invitation_token` | UUID | Für Selbst-Registrierung |
| `logo_url` | TEXT | Pfad zum Firmenlogo |
| `vat_id` | TEXT | USt-ID |
| `website` | TEXT | Firmenwebsite |
| `legal_name` | TEXT | Vollständiger juristischer Name |

### 3.3 Storage

| Bucket | Zweck | Public |
|--------|-------|--------|
| `company-logos` | Firmenlogos | ✅ Ja |

---

## 4. Implementierte Features

### 4.1 Berater-Portal (`/v7/berater/`)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Dashboard | ✅ | Statistiken, Navigation zu Förder-/FZul-Beratung |
| Firmenübersicht | ✅ | Liste aller Kundenfirmen mit Status |
| Firma anlegen | ✅ | Modal mit optionaler Admin-Erstellung |
| Firma bearbeiten | ✅ | Alle Stammdaten |
| Status-System | ✅ | invited → registered → active |
| Firmen-Detailseite | ✅ | Projekte, Mitarbeiter, Arbeitspakete |
| ZIM-Import | ✅ | PDF-Parser via Railway-Service |
| Projekt-CRUD | ✅ | Anlegen, Bearbeiten, Löschen |
| Mitarbeiter-CRUD | ✅ | Anlegen, Bearbeiten, Löschen |
| Arbeitspaket-CRUD | ✅ | Anlegen, Bearbeiten, Löschen |

### 4.2 Firmen-Portal (`/v7/firma/`)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Dashboard | ✅ | Willkommen, Statistiken, Navigation |
| Firmendaten anzeigen | ✅ | 3-Spalten-Layout (Logo, Adresse, Kontakt) |
| Firmendaten bearbeiten | ✅ | Modal mit allen Feldern |
| Logo-Upload | ✅ | Supabase Storage |
| Zeiterfassung | ⏳ | Sprint 2 |
| Projekte verwalten | ⏳ | Sprint 2 |
| Mitarbeiter verwalten | ⏳ | Sprint 2 |
| Berichte | ⏳ | Sprint 3 |

### 4.3 Login & Routing

| Feature | Status |
|---------|--------|
| Rollenbasierter Redirect | ✅ |
| V6/V7 Koexistenz | ✅ |
| Bestehende V6-User → V7 | ✅ (manuell via SQL) |

---

## 5. URL-Struktur

### 5.1 Berater-Portal

```
/v7/berater/                           # Dashboard
/v7/berater/foerderung/                # Firmenübersicht
/v7/berater/foerderung/firma/[id]/     # Firmen-Detailseite
/v7/berater/foerderung/import/         # ZIM-Import
/v7/berater/fzul/                      # FZul-Firmenauswahl (geplant)
```

### 5.2 Firmen-Portal

```
/v7/firma/                             # Dashboard
/v7/firma/zeiterfassung/               # Zeiterfassung (geplant)
/v7/firma/projekte/                    # Projekte (geplant)
/v7/firma/mitarbeiter/                 # Mitarbeiter (geplant)
/v7/firma/berichte/                    # Berichte (geplant)
```

---

## 6. Externe Services

### 6.1 ZIM-PDF-Parser

| Eigenschaft | Wert |
|-------------|------|
| URL | https://web-production-e2e1.up.railway.app |
| Endpunkt | POST /parse-zim |
| Input | PDF-Datei (multipart/form-data) |
| Output | JSON mit Projektdaten |
| Unterstützt | ZIM-Formulare ab 2022 (cg_VMS_*) |

---

## 7. Testdaten V7

### 7.1 Beraterfirma

| Firma | ID |
|-------|-----|
| Cubintec GmbH | (consultant_company_id) |

### 7.2 Kundenfirmen

| Firma | Admin | Status |
|-------|-------|--------|
| AS System GmbH | Thomas Dührkop | ✅ active |
| Tippl GmbH | Mario Tippl | ✅ active |
| Alacsystems GmbH & Co. KG | - | active |
| Automotive Synergies GmbH | - | active |
| Stoma GmbH | - | active |

### 7.3 Test-Logins

| Email | Rolle | Portal |
|-------|-------|--------|
| m.ditscherlein@cubintec.com | consultant | Berater |
| t.duehrkop@assystem.de | client_admin | Firma |
| mario.tippl@tippl.de | client_admin | Firma |

---

## 8. Deployment

### 8.1 Branches

| Branch | URL | Zweck |
|--------|-----|-------|
| `main` | projektzeiterfassung20.vercel.app | Produktion (V6) |
| `v7-dev` | Preview-URL | Entwicklung (V7) |

### 8.2 Git-Tags

| Tag | Datum | Beschreibung |
|-----|-------|--------------|
| v7.3.2-dev | 06.01.2026 | Firmendaten + Logo-Upload |
| v7.3.1-dev | 06.01.2026 | Einheitliches Header-Design |
| v7.3.0-dev | 06.01.2026 | Firmen-Portal Sprint 1 |

---

## 9. Nächste Schritte

### 9.1 Sprint 2: Zeiterfassung (Firmen-Portal)

| Feature | Aufwand | Priorität |
|---------|---------|-----------|
| Zeiterfassung-Seite | 6-8h | HOCH |
| Kalender-Ansicht | 4h | MITTEL |
| Monatsübersicht | 3h | MITTEL |
| Export (Excel) | 2h | NIEDRIG |

### 9.2 Später

| Feature | Aufwand |
|---------|---------|
| Phase 3: FZul-Migration | 15-20h |
| Phase 5: Production RLS | 4-6h |
| Automatische V6→V7 User-Migration | 2h |

---

## 10. Design-Prinzipien

> "So einfach und einheitlich wie möglich" - Nokia 2110 / Apple

| Prinzip | Umsetzung |
|---------|-----------|
| **Konsistenz** | Immer Modals für Bearbeitung |
| **Klarheit** | Grün = Firma, Blau = Berater |
| **Einfachheit** | Wenige Klicks zum Ziel |
| **Intuition** | Stift-Icon = Bearbeiten (universell) |

---

## 11. Versions-Historie

| Version | Datum | Änderungen |
|---------|-------|------------|
| **v7.3.2** | 06.01.2026 | Firmendaten 3-Spalten, Logo-Upload, USt-ID/Website |
| **v7.3.1** | 06.01.2026 | Einheitliches Header-Design (Blau/Grün) |
| **v7.3.0** | 06.01.2026 | Firmen-Portal Sprint 1, Status-System |
| v7.2.4 | 05.01.2026 | ZIM-Import funktional |
| v7.1.6 | 04.01.2026 | Firmen-Detailseite CRUD komplett |
| v7.1.1 | 02.01.2026 | Rollenbasierte Navigation |
| v7.0.0 | 27.12.2024 | Berater-Portal Grundstruktur |
| v6.7.16 | 20.12.2024 | Letzte stabile V6 |

---

**Erstellt:** 06. Januar 2026 (Heilige Drei Könige 👑👑👑)  
**Autor:** Claude AI / Martin Ditscherlein
