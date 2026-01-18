# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.9  
**SW-Release:** V7.3  
**Datum:** 18. Januar 2026  
**Projekt:** Projektzeiterfassung für FuE-Fördervorhaben  
**Status:** V7 Entwicklung - Phase 3 (Firmen-Portal)

---

## 1. Projektstatus Übersicht

### 1.1 Versionen

| Version | Status | Beschreibung |
|---------|--------|--------------|
| **V6** | ✅ Produktion | Stabile Version auf main-Branch (FZul-Analyse) |
| **V7** | 🔧 Entwicklung | Berater-Portal + Firmen-Portal auf v7-dev |

### 1.2 Aktueller Stand V7

| Komponente | Status | Version |
|------------|--------|---------|
| Berater-Portal | ✅ Funktional | v7.3.3 |
| Firmen-Portal | ✅ Grundfunktionen | v7.3.5 |
| **Zeiterfassung** | ✅ **Fertig** | **v7.3.12** |
| FZul-Migration | ⏳ Ausstehend | Phase 4 |

---

## 2. Entwicklungsphasen

### 2.1 Phasenübersicht

Die Entwicklung von PZE gliedert sich in 5 Hauptphasen. **Phase 0** umfasst die V6-Vorarbeit (Okt 2025 - Dez 2025), die als Grundlage für V7 dient. Die **Phasen 1-5** beschreiben die V7-Entwicklung (seit Dez 2025).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 0: V6-VORARBEIT (Okt-Dez 2025)                              ✅ FERTIG │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Grundlagen, die in V7 übernommen wurden:                                   │
│  • Datenmodell (Projekte, MA, Arbeitspakete, Zeiterfassung)                │
│  • FZul-Analyse-Logik (Kapazitätsberechnung, Stundenverteilung)            │
│  • Excel-Import (ZIM/BMBF-Stundennachweise)                                 │
│  • PDF-Export (FZul-Jahres-Stundennachweis)                                 │
│  • UI/UX-Konzepte (Kalender-Raster, Tages-Editor)                          │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: BASIS-INFRASTRUKTUR (Dez 2025 - Jan 2026)                ✅ FERTIG │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • V7-Datenbank-Schema (Berater/Kunden-Hierarchie)                         │
│  • Login & Authentifizierung (Supabase Auth)                                │
│  • Rollenbasierter Redirect (Berater→Portal, Firma→Portal)                 │
│  • Berater-Dashboard Grundstruktur                                          │
│  • Navigation & Header-Design (Blau/Grün-Schema)                           │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: BERATER-PORTAL (Jan 2026)                                ✅ FERTIG │
│  ─────────────────────────────────────────────────────────────────────────  │
│  2a) CRUD-Funktionen:                                                       │
│      • Firmenübersicht, Firma anlegen/bearbeiten, Logo-Upload              │
│      • Firmen-Detailseite (Projekte, MA, APs)                              │
│      • Projekt/Mitarbeiter/Arbeitspaket CRUD                               │
│      • MA → Projekt und MA → AP Zuordnung                                  │
│                                                                             │
│  2b) ZIM-PDF-Import:                                                        │
│      • Python PDF-Parser (PyMuPDF)                                          │
│      • Railway Microservice                                                 │
│      • Import-UI mit Vorschau                                               │
│      • Automatischer Reimport                                               │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: FIRMEN-PORTAL (Jan 2026)                              🔄 IN ARBEIT │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ✅ Erledigt:                                                               │
│      • Firmen-Dashboard mit Statistiken                                     │
│      • Zeiterfassung komplett (v7.3.12)                                     │
│        - Excel-ähnliche Navigation                                          │
│        - PDF-Export mit Auto-Filename                                       │
│        - Bundesland-Feiertage                                               │
│                                                                             │
│  ⏳ Offen:                                                                   │
│      • Projekte verwalten (/firma/projekte)                                 │
│      • Mitarbeiter verwalten (/firma/mitarbeiter)                           │
│      • Berichte (/firma/berichte)                                           │
│      • Wording projektartspezifisch (Netzwerk vs Standard)                  │
│      • Header-Farbe Firmen-Detailseite (Berater-Portal)                    │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: FZUL-MIGRATION (geplant)                                 ⏳ OFFEN │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Migration der V6-FZul-Funktionen nach V7:                                  │
│      • FZul-Datenbank-Tabellen (fzul_employee_settings, etc.)              │
│      • MA-Stammdaten UI                                                     │
│      • FZul-Editor (Wizard, Kalender-Raster, Tages-Editor)                 │
│      • PDF-Generierung BMF-konform                                          │
│      • PDF-Archiv & Freigabe-Workflow                                       │
│                                                                             │
│  Basis: V6-FZul-Analyse (bewährte Logik wird übernommen)                   │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: PRODUKTION (geplant)                                     ⏳ OFFEN │
│  ─────────────────────────────────────────────────────────────────────────  │
│      • RLS-Policies aktivieren (Row Level Security)                         │
│      • DSGVO-Autorisierung (Berater-Zugriff durch GF)                      │
│      • Multi-Mandanten-Fähigkeit (weitere Beraterfirmen)                   │
│      • Performance-Optimierung (Indizes, Caching)                          │
│      • Dokumentation & Schulung (Benutzerhandbuch)                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 V6-Vorarbeit (Phase 0) - Was wurde übernommen?

**Hinweis zur Versionierung:** Die Versionen V1-V5 (Okt-Nov 2025) waren explorative Prototypen und Gehversuche, in denen Grundkonzepte erprobt wurden. V6 war die erste produktiv nutzbare Version, die auf dem main-Branch deployed wurde. Die V7-Entwicklung baut auf den Erkenntnissen aller Vorversionen auf.

Die V6-Entwicklung (Oktober - Dezember 2025) hat wichtige Grundlagen geschaffen:

| V6-Feature | Übernahme in V7 | Status |
|------------|-----------------|--------|
| Datenmodell (Projekte, MA, APs) | → V7-Schema mit Berater-Hierarchie | ✅ Übernommen |
| Excel-Import (ZIM/BMBF) | → Wird in Phase 4 migriert | ⏳ Geplant |
| FZul-Analyse-Logik | → Wird in Phase 4 migriert | ⏳ Geplant |
| PDF-Export (Stundennachweis) | → Neu implementiert in v7.3.12 | ✅ Neu gebaut |
| Kalender-Raster UI | → Wird in Phase 4 übernommen | ⏳ Geplant |
| Kapazitätsberechnung | → Wird in Phase 4 übernommen | ⏳ Geplant |

**Wichtig:** V6 bleibt auf dem `main`-Branch produktiv nutzbar, bis V7 alle Funktionen übernommen hat.

### 2.3 Phasen-Details mit Arbeitspaketen

Die detaillierte Aufschlüsselung aller Arbeitspakete ist im separaten Dokument **PZE-V7-PROJEKTPLAN-v1.x.xlsx** gepflegt. Der Projektplan enthält:

- Hierarchische Nummerierung (1, 1.1, 1.2, ... wie bei Förderprojekten)
- Plan-Aufwand (Stunden bei externer Vergabe)
- Ist-Aufwand (tatsächlicher Aufwand mit Claude AI)
- Status (✅ Fertig / 🔄 In Arbeit / ⏳ Offen)
- Version und Datum der Fertigstellung

---

## 3. Versionierungskonzept

### 3.1 Schema

```
Datei-Version:  v[Release].[Änderungsschritt]
Beispiel:       v7.3.12 = Release 7.3, 12. Änderung in diesem Release
```

### 3.2 Regeln

| Element | Format | Beschreibung |
|---------|--------|--------------|
| **SW-Release** | V7.3 | Hauptversion des Gesamtsystems |
| **Datei-Version** | v7.3.12 | Release + Änderungsschritt dieser Datei |
| **PH-Version** | 4.9 | Pflichtenheft-Dokumentversion |

**WICHTIG:** Jede funktionale Änderung = neue Versionsnummer!

### 3.3 Datei-Header Format

```typescript
// src/app/v7/firma/zeiterfassung/page.tsx
// VERSION: v7.3.12 (SW-Release V7.3)
// DATUM: 08. Januar 2026
// BESCHREIBUNG: Zeiterfassung mit Excel-Navigation und PDF-Export
```

---

## 4. Architektur V7

### 4.1 Benutzer-Hierarchie

```
Berater-Firma (z.B. Cubintec GmbH)
    └── Berater (consultant)
            └── betreut mehrere Kundenfirmen
                    
Kunden-Firma (z.B. AS System GmbH)
    ├── Firmen-Admin (client_admin) - z.B. Geschäftsführer
    ├── Projektleiter (project_leader)
    └── Mitarbeiter (employee)
```

### 4.2 Rollen und Berechtigungen

| Rolle | Portal | Rechte |
|-------|--------|--------|
| `system_admin` | Berater | Vollzugriff |
| `consultant` | Berater | Alle Kundenfirmen verwalten |
| `client_admin` | Firma | Eigene Firma verwalten, alle Mitarbeiter sehen |
| `project_leader` | Firma | Projekte verwalten, Team-Zeiten sehen |
| `employee` | Firma | Nur eigene Zeiterfassung |

### 4.3 Farbschema

| Portal | Farbe | Hex-Code | Verwendung |
|--------|-------|----------|------------|
| Berater-Portal | Ozeanblau | `#002451` | Header zeigt "Ich bin Berater" |
| Firmen-Portal | Cubintec-Grün | `#65A655` | Header zeigt "Ich bin Firma" |

**Regel:** Die Header-Farbe zeigt immer an, **wer eingeloggt ist** - nicht welche Daten man gerade sieht.

---

## 5. Header-Design (v7.3.3)

### 5.1 Einheitliches Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [← Zurück]   [PZE]   Seitentitel                    Benutzer [Abmelden]     │
│                      Untertitel                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Regeln

| Element | Position | Immer gleich? |
|---------|----------|---------------|
| ← Zurück | Links | ✅ Ja (außer Hauptseiten) |
| PZE Badge | Nach Zurück | ✅ Ja |
| Seitentitel | Mitte-Links | ✅ Ja |
| Benutzername | Rechts | ✅ Ja |
| Abmelden | Ganz rechts | ✅ Ja |
| **Aktions-Buttons** | **NIE im Header** | ✅ In Content-Bereich |

### 5.3 Seiten-Titel

| Seite | Zurück? | Titel | Untertitel |
|-------|---------|-------|------------|
| Berater Dashboard | Nein | Berater-Portal | v7 |
| Förderberatung | → Dashboard | Berater-Portal | Förderberatung · ZIM / BMBF |
| FZul-Beratung | → Dashboard | Berater-Portal | FZul-Beratung · §35a EStG |
| Firmen-Detail | → Förderberatung | {Firmenname} | Förderberatung · {Bundesland} |
| Firmen-Portal | Nein | Firmen-Portal | {Firmenname} |
| Zeiterfassung | → Dashboard | Stundennachweis | - |

---

## 6. Datenbank-Schema V7

### 6.1 Haupttabellen

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

### 6.2 Neue Spalten v7.3.x

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
| `federal_state` | TEXT | Bundesland für Feiertage |

**v7_projects:**

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `funding_format` | ENUM | ZIM_SOLO, ZIM_KOOP, ZIM_DS, BMBF, etc. |

### 6.3 funding_format Werte

| Wert | Beschreibung | T-Spalte in Zeiterfassung |
|------|--------------|---------------------------|
| ZIM_SOLO | ZIM Einzelprojekt | Nein |
| ZIM_KOOP | ZIM Kooperationsprojekt | Nein |
| ZIM_NETZWERK | ZIM Netzwerk-Management | Nein |
| ZIM_DS | ZIM Durchführbarkeitsstudie | **Ja** |
| BMBF | BMBF Förderung | Nein |
| BMBF_DS | BMBF Durchführbarkeitsstudie | **Ja** |

### 6.4 Storage

| Bucket | Zweck | Public |
|--------|-------|--------|
| `company-logos` | Firmenlogos | ✅ Ja |

---

## 7. Implementierte Features

### 7.1 Berater-Portal (`/v7/berater/`)

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

### 7.2 Firmen-Portal (`/v7/firma/`)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Dashboard | ✅ | Willkommen, Statistiken, Navigation |
| Firmendaten anzeigen | ✅ | 3-Spalten-Layout (Logo, Adresse, Kontakt) |
| Firmendaten bearbeiten | ✅ | Modal mit allen Feldern |
| Logo-Upload | ✅ | Supabase Storage |
| **Zeiterfassung** | ✅ | **v7.3.12 - Stundennachweis komplett** |
| Projekte verwalten | ⏳ | Phase 3 |
| Mitarbeiter verwalten | ⏳ | Phase 3 |
| Berichte | ⏳ | Phase 3 |

### 7.3 Zeiterfassung (v7.3.12)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Stundennachweis-Formular | ✅ | Excel-konformes Layout |
| Header 2x3 Layout | ✅ | Zuwendungsempfänger, Vorhabenthema, Monat, FKZ, Mitarbeiter |
| Kalender-Eingabe | ✅ | 31 Tage, WE/Feiertage markiert |
| 4+ AP-Zeilen | ✅ | Dynamisch erweiterbar |
| Fehlzeiten | ✅ | U=Urlaub, K=Krankheit, S=Sonstige |
| T-Spalte | ✅ | Nur bei Durchführbarkeitsstudien |
| Excel-Navigation | ✅ | ← → ↑ ↓ Tab Shift+Tab Enter |
| PDF-Export | ✅ | Mit Speicherdialog, Dateiname automatisch |
| Drucken | ✅ | A4 Landscape, alles auf einer Seite |
| Unterschriften | ✅ | Senkrechte Trennlinie, Datum editierbar |
| Bundesland-Feiertage | ✅ | Automatisch aus Firmendaten |

### 7.4 Login & Routing

| Feature | Status |
|---------|--------|
| Rollenbasierter Redirect | ✅ |
| V6/V7 Koexistenz | ✅ |
| Bestehende V6-User → V7 | ✅ (manuell via SQL) |

---

## 8. URL-Struktur

### 8.1 Berater-Portal

```
/v7/berater/                           # Dashboard
/v7/berater/foerderung/                # Firmenübersicht
/v7/berater/foerderung/firma/[id]/     # Firmen-Detailseite
/v7/berater/foerderung/import/         # ZIM-Import
/v7/berater/fzul/                      # FZul-Firmenauswahl
/v7/berater/fzul/firma/[id]/           # FZul-Analyse (Phase 4)
```

### 8.2 Firmen-Portal

```
/v7/firma/                             # Dashboard
/v7/firma/zeiterfassung/               # ✅ Stundennachweis (v7.3.12)
/v7/firma/projekte/                    # Projekte (Phase 3)
/v7/firma/mitarbeiter/                 # Mitarbeiter (Phase 3)
/v7/firma/berichte/                    # Berichte (Phase 3)
```

---

## 9. Externe Services

### 9.1 ZIM-PDF-Parser

| Eigenschaft | Wert |
|-------------|------|
| URL | https://web-production-e2e1.up.railway.app |
| Endpunkt | POST /parse-zim |
| Input | PDF-Datei (multipart/form-data) |
| Output | JSON mit Projektdaten |
| Unterstützt | ZIM-Formulare ab 2022 (cg_VMS_*) |

---

## 10. Testdaten V7

### 10.1 Beraterfirma

| Firma | ID |
|-------|-----|
| Cubintec GmbH | (consultant_company_id) |

### 10.2 Kundenfirmen

| Firma | Admin | Status |
|-------|-------|--------|
| AS System GmbH | Thomas Dührkop | ✅ active |
| Tippl GmbH | Mario Tippl | ✅ active |

### 10.3 Test-Logins

| Email | Rolle | Portal |
|-------|-------|--------|
| m.ditscherlein@cubintec.com | consultant | Berater |
| t.duehrkop@assystem.de | client_admin | Firma |
| mario.tippl@tippl.de | client_admin | Firma |

---

## 11. Deployment

### 11.1 Branches

| Branch | URL | Zweck |
|--------|-----|-------|
| `main` | projektzeiterfassung20.vercel.app | Produktion (V6) |
| `v7-dev` | Preview-URL | Entwicklung (V7) |

### 11.2 Git-Tags

| Tag | Datum | Beschreibung |
|-----|-------|--------------|
| **v7.3.12-dev** | **08.01.2026** | **Zeiterfassung komplett** |
| v7.3.3-dev | 07.01.2026 | Header-Vereinheitlichung, Ozeanblau |
| v7.3.2-dev | 06.01.2026 | Firmendaten + Logo-Upload |
| v7.3.1-dev | 06.01.2026 | Header-Design (Blau/Grün) |
| v7.3.0-dev | 06.01.2026 | Firmen-Portal Sprint 1 |

---

## 12. Offene ToDos

### 12.1 Phase 3 - Noch offen

| ToDo | Beschreibung | Priorität |
|------|--------------|-----------|
| Wording projektartspezifisch | "förderbare Projektarbeiten" (Standard) vs "Management-Arbeiten" (Netzwerk) | Mittel |
| Firmen-Detailseite Header | Berater-Portal: Header-Farbe auf blau (#002451) ändern | Niedrig |
| Projekte verwalten | /v7/firma/projekte - Eigene Projekte sehen | Mittel |
| Mitarbeiter verwalten | /v7/firma/mitarbeiter - MA-Stammdaten pflegen | Mittel |
| Berichte | /v7/firma/berichte - Exports, Übersichten | Niedrig |

### 12.2 Phase 4 - FZul-Migration

| ToDo | Beschreibung | Priorität |
|------|--------------|-----------|
| FZul-Datenbank-Tabellen | fzul_employee_settings, fzul_timesheets, fzul_pdf_archive | Hoch |
| MA-Stammdaten UI | Tab "MA-Daten" im Import-Modul | Hoch |
| FZul-Editor | Wizard, Kalender-Raster, Tages-Editor, Auto-Fill | Hoch |
| PDF-Generierung | BMF-konformer Jahres-Stundennachweis | Hoch |
| PDF-Archiv | Status-Workflow, ZIP-Download | Mittel |

### 12.3 Phase 5 - Produktion

| ToDo | Beschreibung | Priorität |
|------|--------------|-----------|
| RLS-Policies | Row Level Security aktivieren | Hoch |
| DSGVO-Autorisierung | Berater-Zugriff durch GF freigeben | Hoch |
| Multi-Mandanten | Weitere Beraterfirmen ermöglichen | Mittel |
| Performance | Indizes, Caching optimieren | Niedrig |
| Dokumentation | Benutzerhandbuch erstellen | Niedrig |

---

## 13. Design-Prinzipien

> "So einfach und einheitlich wie möglich" - Nokia 2110 / Apple

| Prinzip | Umsetzung |
|---------|-----------|
| **Konsistenz** | Immer Modals für Bearbeitung, einheitlicher Header |
| **Klarheit** | Header-Farbe = wer bin ICH (nicht was sehe ich) |
| **Einfachheit** | Wenige Klicks zum Ziel, keine Aktions-Buttons im Header |
| **Intuition** | Stift-Icon = Bearbeiten, Zurück immer links |
| **Excel-ähnlich** | Zeiterfassung navigierbar wie Tabellenkalkulation |

---

## 14. Änderungshistorie

### 14.1 Pflichtenheft-Versionen

| PH-Version | SW-Release | Datum | Änderungen |
|------------|------------|-------|------------|
| **v4.9** | **V7.3** | **18.01.2026** | **Entwicklungsphasen-Kapitel, Konsistenz mit Projektplan** |
| v4.8 | V7.3 | 08.01.2026 | Zeiterfassung v7.3.12 dokumentiert |
| v4.7 | V7.3 | 07.01.2026 | Versionierungskonzept, Header-Vereinheitlichung |
| v4.6 | V7.3 | 06.01.2026 | Firmen-Portal Sprint 1, Logo-Upload |
| v4.5 | V7.2 | 05.01.2026 | ZIM-Import, Arbeitspakete |
| v4.4 | V7.1 | 04.01.2026 | Firmen-Detailseite CRUD |
| v4.3 | V7.1 | 03.01.2026 | Rollenbasierte Navigation |

### 14.2 SW-Release-Historie

| SW-Release | Datum | Hauptfeatures |
|------------|-------|---------------|
| **V7.3** | **08.01.2026** | **Zeiterfassung komplett (v7.3.12)** |
| V7.3 | 07.01.2026 | Header-Design, Firmen-Portal, Logo-Upload |
| V7.2 | 05.01.2026 | ZIM-Import funktional |
| V7.1 | 02.01.2026 | Berater-Portal CRUD komplett |
| V7.0 | 27.12.2025 | Berater-Portal Grundstruktur |
| V6.7 | 20.12.2025 | Letzte stabile V6 (FZul-Analyse) |
| V1-V5 | Okt-Nov 2025 | Prototypen und Konzepterprobung |

### 14.3 Zugehörige Dokumente

| Dokument | Version | Beschreibung |
|----------|---------|--------------|
| **PZE-V7-PROJEKTPLAN** | v1.2 | Detaillierter Arbeitsplan mit Plan/Ist-Aufwänden |
| V7-DB-SCHEMA.sql | - | Datenbank-Schema Referenz |
| KONZEPT-FZUL-ONLINE-EDITOR.md | - | FZul-Editor Konzept (Phase 4) |
| KONZEPT-FIRMEN-HIERARCHIE-v7_1.md | - | Berater/Kunden-Architektur |

---

**Erstellt:** 18. Januar 2026  
**Autor:** Claude AI / Martin Ditscherlein  
**Kontakt:** m.ditscherlein@cubintec.com
