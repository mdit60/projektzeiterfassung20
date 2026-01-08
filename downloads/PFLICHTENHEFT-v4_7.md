# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.7  
**SW-Release:** V7.3  
**Datum:** 07. Januar 2026  
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
| Berater-Portal | ✅ Funktional | v7.3.3 |
| Firmen-Portal | ✅ Grundfunktionen | v7.3.2 |
| Zeiterfassung | ⏳ Ausstehend | Sprint 2 |
| FZul-Migration | ⏳ Ausstehend | Phase 3 |

---

## 2. Versionierungskonzept

### 2.1 Schema

```
Datei-Version:  v[Release].[Änderungsschritt]
Beispiel:       v7.3.1 = Release 7.3, erste Änderung in diesem Release
```

### 2.2 Regeln

| Element | Format | Beschreibung |
|---------|--------|--------------|
| **SW-Release** | V7.3 | Hauptversion des Gesamtsystems |
| **Datei-Version** | v7.3.1 | Release + Änderungsschritt dieser Datei |
| **PH-Version** | 4.7 | Pflichtenheft-Dokumentversion |

### 2.3 Datei-Header Format

```typescript
// src/app/v7/berater/fzul/page.tsx
// VERSION: v7.3.1 (SW-Release V7.3)
// DATUM: 07. Januar 2026
// ÄNDERUNG: Header-Vereinheitlichung Ozeanblau
```

### 2.4 Vorteile

- Man sieht sofort, aus welchem Release eine Datei stammt
- Stabile Dateien behalten ihre Version (z.B. v7.1.4)
- Bei Problemen weiß man: "Diese Datei wurde zuletzt in Release X angefasst"
- Verschiedene Dateiversionen können in einem Release koexistieren

### 2.5 Beispiel

| Datei | Version | Bedeutung |
|-------|---------|-----------|
| page-a.tsx | v5.3 | Erstellt/geändert in Release V5, 3 Iterationen |
| page-b.tsx | v7.3.1 | Erstellt/geändert in Release V7.3, 1 Iteration |
| page-c.tsx | v7.1.4 | Seit Release V7.1 stabil, 4 Iterationen damals |

---

## 3. Architektur V7

### 3.1 Benutzer-Hierarchie

```
Berater-Firma (z.B. Cubintec GmbH)
    └── Berater (consultant)
            └── betreut mehrere Kundenfirmen
                    
Kunden-Firma (z.B. AS System GmbH)
    ├── Firmen-Admin (client_admin) - z.B. Geschäftsführer
    ├── Projektleiter (project_leader)
    └── Mitarbeiter (employee)
```

### 3.2 Rollen und Berechtigungen

| Rolle | Portal | Rechte |
|-------|--------|--------|
| `system_admin` | Berater | Vollzugriff |
| `consultant` | Berater | Alle Kundenfirmen verwalten |
| `client_admin` | Firma | Eigene Firma verwalten, alle Mitarbeiter sehen |
| `project_leader` | Firma | Projekte verwalten, Team-Zeiten sehen |
| `employee` | Firma | Nur eigene Zeiterfassung |

### 3.3 Farbschema

| Portal | Farbe | Hex-Code | Verwendung |
|--------|-------|----------|------------|
| Berater-Portal | Ozeanblau | `#0369a1` | Header zeigt "Ich bin Berater" |
| Firmen-Portal | Cubintec-Grün | `#65A655` | Header zeigt "Ich bin Firma" |

**Regel:** Die Header-Farbe zeigt immer an, **wer eingeloggt ist** - nicht welche Daten man gerade sieht.

---

## 4. Header-Design (v7.3.3)

### 4.1 Einheitliches Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [← Zurück]   [PZE]   Seitentitel                    Benutzer [Abmelden] │
│                      Untertitel                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Regeln

| Element | Position | Immer gleich? |
|---------|----------|---------------|
| ← Zurück | Links | ✅ Ja (außer Hauptseiten) |
| PZE Badge | Nach Zurück | ✅ Ja |
| Seitentitel | Mitte-Links | ✅ Ja |
| Benutzername | Rechts | ✅ Ja |
| Abmelden | Ganz rechts | ✅ Ja |
| **Aktions-Buttons** | **NIE im Header** | ✅ In Content-Bereich |

### 4.3 Seiten-Titel

| Seite | Zurück? | Titel | Untertitel |
|-------|---------|-------|------------|
| Berater Dashboard | Nein | Berater-Portal | v7 |
| Förderberatung | → Dashboard | Berater-Portal | Förderberatung · ZIM / BMBF |
| FZul-Beratung | → Dashboard | Berater-Portal | FZul-Beratung · §35a EStG |
| Firmen-Detail | → Förderberatung | {Firmenname} | Förderberatung · {Bundesland} |
| Firmen-Portal | Nein | Firmen-Portal | {Firmenname} |

---

## 5. Datenbank-Schema V7

### 5.1 Haupttabellen

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

### 5.2 Neue Spalten v7.3.x

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

### 5.3 Storage

| Bucket | Zweck | Public |
|--------|-------|--------|
| `company-logos` | Firmenlogos | ✅ Ja |

---

## 6. Implementierte Features

### 6.1 Berater-Portal (`/v7/berater/`)

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
| FZul-Beratung | ✅ | Firmenauswahl für FZul-Analyse |

### 6.2 Firmen-Portal (`/v7/firma/`)

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

### 6.3 Login & Routing

| Feature | Status |
|---------|--------|
| Rollenbasierter Redirect | ✅ |
| V6/V7 Koexistenz | ✅ |
| Bestehende V6-User → V7 | ✅ (manuell via SQL) |

---

## 7. URL-Struktur

### 7.1 Berater-Portal

```
/v7/berater/                           # Dashboard
/v7/berater/foerderung/                # Firmenübersicht
/v7/berater/foerderung/firma/[id]/     # Firmen-Detailseite
/v7/berater/foerderung/import/         # ZIM-Import
/v7/berater/fzul/                      # FZul-Firmenauswahl
/v7/berater/fzul/firma/[id]/           # FZul-Analyse (geplant)
```

### 7.2 Firmen-Portal

```
/v7/firma/                             # Dashboard
/v7/firma/zeiterfassung/               # Zeiterfassung (geplant)
/v7/firma/projekte/                    # Projekte (geplant)
/v7/firma/mitarbeiter/                 # Mitarbeiter (geplant)
/v7/firma/berichte/                    # Berichte (geplant)
```

---

## 8. Externe Services

### 8.1 ZIM-PDF-Parser

| Eigenschaft | Wert |
|-------------|------|
| URL | https://web-production-e2e1.up.railway.app |
| Endpunkt | POST /parse-zim |
| Input | PDF-Datei (multipart/form-data) |
| Output | JSON mit Projektdaten |
| Unterstützt | ZIM-Formulare ab 2022 (cg_VMS_*) |

---

## 9. Testdaten V7

### 9.1 Beraterfirma

| Firma | ID |
|-------|-----|
| Cubintec GmbH | (consultant_company_id) |

### 9.2 Kundenfirmen

| Firma | Admin | Status |
|-------|-------|--------|
| AS System GmbH | Thomas Dührkop | ✅ active |
| Tippl GmbH | Mario Tippl | ✅ active |

### 9.3 Test-Logins

| Email | Rolle | Portal |
|-------|-------|--------|
| m.ditscherlein@cubintec.com | consultant | Berater |
| t.duehrkop@assystem.de | client_admin | Firma |
| mario.tippl@tippl.de | client_admin | Firma |

---

## 10. Deployment

### 10.1 Branches

| Branch | URL | Zweck |
|--------|-----|-------|
| `main` | projektzeiterfassung20.vercel.app | Produktion (V6) |
| `v7-dev` | Preview-URL | Entwicklung (V7) |

### 10.2 Git-Tags

| Tag | Datum | Beschreibung |
|-----|-------|--------------|
| v7.3.3-dev | 07.01.2026 | Header-Vereinheitlichung, Ozeanblau |
| v7.3.2-dev | 06.01.2026 | Firmendaten + Logo-Upload |
| v7.3.1-dev | 06.01.2026 | Header-Design (Blau/Grün) |
| v7.3.0-dev | 06.01.2026 | Firmen-Portal Sprint 1 |

---

## 11. Nächste Schritte

### 11.1 Sprint 2: Zeiterfassung (Firmen-Portal)

| Feature | Aufwand | Priorität |
|---------|---------|-----------|
| Zeiterfassung-Seite | 6-8h | HOCH |
| Kalender-Ansicht | 4h | MITTEL |
| Monatsübersicht | 3h | MITTEL |
| Export (Excel) | 2h | NIEDRIG |

### 11.2 Später

| Feature | Aufwand |
|---------|---------|
| Phase 3: FZul-Migration | 15-20h |
| Phase 5: Production RLS | 4-6h |
| Automatische V6→V7 User-Migration | 2h |

---

## 12. Design-Prinzipien

> "So einfach und einheitlich wie möglich" - Nokia 2110 / Apple

| Prinzip | Umsetzung |
|---------|-----------|
| **Konsistenz** | Immer Modals für Bearbeitung, einheitlicher Header |
| **Klarheit** | Header-Farbe = wer bin ICH (nicht was sehe ich) |
| **Einfachheit** | Wenige Klicks zum Ziel, keine Aktions-Buttons im Header |
| **Intuition** | Stift-Icon = Bearbeiten, Zurück immer links |

---

## 13. Änderungshistorie

### 13.1 Pflichtenheft-Versionen

| PH-Version | SW-Release | Datum | Änderungen |
|------------|------------|-------|------------|
| **v4.7** | V7.3 | 07.01.2026 | Versionierungskonzept, Header-Vereinheitlichung |
| v4.6 | V7.3 | 06.01.2026 | Firmen-Portal Sprint 1, Logo-Upload |
| v4.5 | V7.2 | 05.01.2026 | ZIM-Import, Arbeitspakete |
| v4.4 | V7.1 | 04.01.2026 | Firmen-Detailseite CRUD |
| v4.3 | V7.1 | 03.01.2026 | Rollenbasierte Navigation |

### 13.2 SW-Release-Historie

| SW-Release | Datum | Hauptfeatures |
|------------|-------|---------------|
| **V7.3** | 07.01.2026 | Header-Design, Firmen-Portal, Logo-Upload |
| V7.2 | 05.01.2026 | ZIM-Import funktional |
| V7.1 | 02.01.2026 | Berater-Portal CRUD komplett |
| V7.0 | 27.12.2024 | Berater-Portal Grundstruktur |
| V6.7 | 20.12.2024 | Letzte stabile V6 |

---

**Erstellt:** 07. Januar 2026  
**Autor:** Claude AI / Martin Ditscherlein  
**Kontakt:** m.ditscherlein@cubintec.com
