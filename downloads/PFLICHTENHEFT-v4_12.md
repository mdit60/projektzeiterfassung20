# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.12  
**SW-Release:** V7.3  
**Datum:** 19. Januar 2026  
**Projekt:** Projektzeiterfassung für FuE-Fördervorhaben  
**Status:** V7 Entwicklung - Phase 3 (Firmen-Portal)

---

## 1. Projektstatus Übersicht

### 1.1 Versionen

| Version | Status | Beschreibung |
|---------|--------|--------------|
| **V6** | ✓ Produktion | Stabile Version auf main-Branch (FZul-Analyse) |
| **V7** | 🔧 Entwicklung | Berater-Portal + Firmen-Portal auf v7-dev |

### 1.2 Aktueller Stand V7

| Komponente | Status | Version |
|------------|--------|---------|
| Berater-Portal | ✓ Funktional | v7.3.3 |
| Firmen-Portal | ✓ Grundfunktionen | v7.3.5 |
| **Zeiterfassung** | ✓ **Fertig** | **v7.3.12** |
| **Firmen-Bearbeitung** | 🔧 In Arbeit | **v7.3.33** |
| FZul-Migration | ⏳ Ausstehend | Phase 4 |

---

## 2. Entwicklungsphasen

### 2.1 Phasenübersicht

Die Entwicklung von PZE gliedert sich in 5 Hauptphasen plus Projektmanagement. **Phase 0** umfasst die V6-Vorarbeit (Okt 2025 - Dez 2025), die als Grundlage für V7 dient. Die **Phasen 1-5** beschreiben die V7-Entwicklung (seit Dez 2025). **PM** erfasst phasenübergreifende Meta-Arbeit am Projekt selbst.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 0: V6-VORARBEIT (Okt-Dez 2025)                              ✓ FERTIG │
│  ─────────────────────────────────────────────────────────────────────────────────  │
│  Grundlagen, die in V7 übernommen wurden:                                   │
│  • Datenmodell (Projekte, MA, Arbeitspakete, Zeiterfassung)                │
│  • FZul-Analyse-Logik (Kapazitätsberechnung, Stundenverteilung)            │
│  • Excel-Import (ZIM/BMBF-Stundennachweise)                                 │
│  • PDF-Export (FZul-Jahres-Stundennachweis)                                 │
│  • UI/UX-Konzepte (Kalender-Raster, Tages-Editor)                          │
└─────────────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: BASIS-INFRASTRUKTUR (Dez 2025 - Jan 2026)                ✓ FERTIG │
│  ─────────────────────────────────────────────────────────────────────────────────  │
│  • V7-Datenbank-Schema (Berater/Kunden-Hierarchie)                         │
│  • Login & Authentifizierung (Supabase Auth)                                │
│  • Rollenbasierter Redirect (Berater→Portal, Firma→Portal)                 │
│  • Berater-Dashboard Grundstruktur                                          │
│  • Navigation & Header-Design (Blau/Grün-Schema)                           │
└─────────────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: BERATER-PORTAL (Jan 2026)                                ✓ FERTIG │
│  ─────────────────────────────────────────────────────────────────────────────────  │
│  • Kundenfirmen verwalten (CRUD)                                            │
│  • Projekte verwalten (CRUD)                                                │
│  • Mitarbeiter verwalten (CRUD)                                             │
│  • Arbeitspakete verwalten (CRUD)                                           │
│  • ZIM-PDF-Import                                                            │
│  • MA-AP-Zuordnung mit PM-Verteilung                                        │
└─────────────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: FIRMEN-PORTAL (Jan 2026)                           🔧 IN ARBEIT   │
│  ─────────────────────────────────────────────────────────────────────────────────  │
│  ✓ Dashboard mit Firmendaten                                                │
│  ✓ Zeiterfassung (v7.3.12 - Excel-ähnlich)                                  │
│  🔧 Firmendaten bearbeiten auf Detailseite (v7.3.33 - NEU)                 │
│  🔧 Förderrelevante Firmendaten (KMU-Status, etc.)                          │
│  ⏳ Projekte-Übersicht                                                       │
│  ⏳ Mitarbeiter verwalten                                                    │
│  ⏳ Berichte                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Neue Anforderungen v7.3.33

### 3.1 Firmendaten-Bearbeitung auf Detailseite

**Hintergrund:** Die Firmen-Detailseite (`/v7/berater/foerderung/firma/[id]`) zeigt aktuell die Firmendaten nur lesend an. Es fehlt die Möglichkeit, diese Daten direkt zu bearbeiten.

**Anforderung:** Der natürliche Workflow ist:
1. Berater klickt auf Firma in der Übersicht
2. Firmenseite öffnet sich
3. Berater kann hier alle Daten bearbeiten

Das Bearbeiten in der Übersicht ist unpraktisch und nicht intuitiv.

#### 3.1.1 Funktionale Anforderungen

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| F1 | Stift-Icon im "Firmendaten"-Bereich öffnet Bearbeitungs-Modal | Hoch |
| F2 | Modal enthält alle Stammdaten (Name, Adresse, Kontakt) | Hoch |
| F3 | Modal enthält förderrelevante Daten (KMU-Status, etc.) | Hoch |
| F4 | Speichern aktualisiert Anzeige sofort | Hoch |
| F5 | Validierung (Pflichtfelder, Formate) | Mittel |

#### 3.1.2 Bearbeitbare Felder

**Stammdaten:**
- Firmenname (Pflichtfeld)
- Kurzname
- Straße
- PLZ (5 Ziffern)
- Ort
- Bundesland (Dropdown)
- Ansprechpartner
- E-Mail (Format-Validierung)
- Telefon

**Förderrelevante Daten (NEU):**
- KMU-Status (micro/small/medium/large)
- Gründungsjahr (4 Ziffern)
- Branche / Wirtschaftszweig
- Mitarbeiterzahl
- Jahresumsatz (€)
- Bilanzsumme (€)
- Handelsregister-Nummer
- USt-IdNr.

**Interne Notizen:**
- internal_notes (Textarea)

### 3.2 UI-Bereinigung: Statistik-Zeilen

**Begründung:** Die Statistik-Kennzahlen in den Übersichten haben geringe Aussagekraft und gehören in einen separaten Berichte-Bereich.

| Bereich | Änderung |
|---------|----------|
| Berater-Portal Kundenfirmen | Statistik-Zeile entfernen |
| Firmen-Portal Dashboard | ✓ Bereits entfernt |
| Firmen-Detailseite | Behalten (hat hier Kontext) |

---

## 4. Architektur & Rollen

### 4.1 Hierarchie

```
Beraterfirma (z.B. Cubintec GmbH)
    └── Berater (consultant) - z.B. M. Ditscherlein
        └── betreut Kundenfirmen

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
| Berater-Portal | Ozeanblau | `#0369a1` | Header zeigt "Ich bin Berater" |
| Firmen-Portal | Cubintec-Grün | `#65A655` | Header zeigt "Ich bin Firma" |

**Regel:** Die Header-Farbe zeigt immer an, **wer eingeloggt ist** - nicht welche Daten man gerade sieht.

---

## 5. Header-Design (v7.3.3)

### 5.1 Einheitliches Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [← Zurück]   [PZE]   Seitentitel                    Benutzer [Abmelden]     │
│                      Untertitel                                             │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Regeln

| Element | Position | Immer gleich? |
|---------|----------|---------------|
| ← Zurück | Links | ✓ Ja (außer Hauptseiten) |
| PZE Badge | Nach Zurück | ✓ Ja |
| Seitentitel | Mitte-Links | ✓ Ja |
| Benutzername | Rechts | ✓ Ja |
| Abmelden | Ganz rechts | ✓ Ja |
| **Aktions-Buttons** | **NIE im Header** | ✓ In Content-Bereich |

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

### 6.2 Neue Spalten v7.3.33 (v7_client_companies)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `kmu_status` | VARCHAR(50) | micro, small, medium, large |
| `founding_year` | INTEGER | Gründungsjahr |
| `industry_sector` | VARCHAR(255) | Branche/Wirtschaftszweig |
| `employee_count` | INTEGER | Anzahl Mitarbeiter |
| `annual_revenue` | DECIMAL(15,2) | Jahresumsatz in EUR |
| `balance_sheet_total` | DECIMAL(15,2) | Bilanzsumme in EUR |
| `commercial_register` | VARCHAR(100) | Handelsregisternummer |
| `vat_id` | VARCHAR(50) | USt-IdNr. |

### 6.3 KMU-Status Definition (EU-Standard)

| Wert | Bezeichnung | Definition |
|------|-------------|------------|
| `micro` | Kleinstunternehmen | < 10 MA, ≤ 2 Mio € Umsatz oder Bilanzsumme |
| `small` | Kleines Unternehmen | < 50 MA, ≤ 10 Mio € Umsatz oder Bilanzsumme |
| `medium` | Mittleres Unternehmen | < 250 MA, ≤ 50 Mio € Umsatz, ≤ 43 Mio € Bilanzsumme |
| `large` | Großunternehmen | ≥ 250 MA oder überschreitet KMU-Schwellen |

### 6.4 Bestehende Spalten v7.3.x

**v7_client_companies:**

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `status` | TEXT | invited, registered, active, inactive |
| `onboarding_type` | TEXT | by_consultant, self_registration |
| `invitation_token` | UUID | Für Selbst-Registrierung |
| `logo_url` | TEXT | Pfad zum Firmenlogo |
| `website` | TEXT | Firmenwebsite |
| `legal_name` | TEXT | Vollständiger juristischer Name |
| `federal_state` | TEXT | Bundesland für Feiertage |

### 6.5 funding_format Werte

| Wert | Beschreibung | T-Spalte in Zeiterfassung |
|------|--------------|---------------------------|
| ZIM_SOLO | ZIM Einzelprojekt | Nein |
| ZIM_KOOP | ZIM Kooperationsprojekt | Nein |
| ZIM_NETZWERK | ZIM Netzwerk-Management | Nein |
| ZIM_DS | ZIM Durchführbarkeitsstudie | **Ja** |
| BMBF | BMBF Förderung | Nein |
| BMBF_DS | BMBF Durchführbarkeitsstudie | **Ja** |

### 6.6 Storage

| Bucket | Zweck | Public |
|--------|-------|--------|
| `company-logos` | Firmenlogos | ✓ Ja |

---

## 7. Implementierte Features

### 7.1 Berater-Portal (`/v7/berater/`)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Dashboard | ✓ | Statistiken, Navigation zu Förder-/FZul-Beratung |
| Firmenübersicht | ✓ | Liste aller Kundenfirmen mit Status |
| Firma anlegen | ✓ | Modal mit optionaler Admin-Erstellung |
| Firma bearbeiten | ✓ | Alle Stammdaten |
| Status-System | ✓ | invited → registered → active |
| Firmen-Detailseite | ✓ | Projekte, Mitarbeiter, Arbeitspakete |
| **Firmendaten auf Detailseite bearbeiten** | 🔧 | **v7.3.33 - In Arbeit** |
| ZIM-Import | ✓ | PDF-Parser via Railway-Service |
| Projekt-CRUD | ✓ | Anlegen, Bearbeiten, Löschen |
| Mitarbeiter-CRUD | ✓ | Anlegen, Bearbeiten, Löschen |
| Arbeitspaket-CRUD | ✓ | Anlegen, Bearbeiten, Löschen |
| FZul-Beratung | ✓ | Firmenauswahl für FZul-Analyse |

### 7.2 Firmen-Portal (`/v7/firma/`)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Dashboard | ✓ | Willkommen, Navigation |
| Firmendaten anzeigen | ✓ | 3-Spalten-Layout (Logo, Adresse, Kontakt) |
| Firmendaten bearbeiten | ✓ | Modal mit allen Feldern |
| Logo-Upload | ✓ | Supabase Storage |
| **Zeiterfassung** | ✓ | **v7.3.12 - Stundennachweis komplett** |
| Projekte verwalten | ⏳ | Phase 3 |
| Mitarbeiter verwalten | ⏳ | Phase 3 |
| Berichte | ⏳ | Phase 3 |

### 7.3 Zeiterfassung (v7.3.12)

| Feature | Status |
|---------|--------|
| Excel-ähnliches Raster | ✓ |
| Keyboard-Navigation | ✓ |
| Mitarbeiter-Auswahl | ✓ |
| Projekt-Auswahl | ✓ |
| Auto-Save | ✓ |
| PDF-Export | ✓ |
| T-Spalte (Dienstreise) | ✓ |

---

## 8. API-Endpunkte V7

### 8.1 Authentifizierung

| Endpunkt | Beschreibung |
|----------|--------------|
| POST /api/v7/auth/login | Login mit Email/Passwort |
| POST /api/v7/auth/logout | Logout |
| GET /api/v7/auth/me | Aktueller Benutzer |

### 8.2 Firmendaten

| Endpunkt | Beschreibung |
|----------|--------------|
| GET /api/v7/companies | Liste aller Firmen |
| GET /api/v7/companies/[id] | Firma-Details |
| POST /api/v7/companies | Neue Firma anlegen |
| PUT /api/v7/companies/[id] | Firma aktualisieren |
| DELETE /api/v7/companies/[id] | Firma löschen |

### 8.3 Projekte

| Endpunkt | Beschreibung |
|----------|--------------|
| GET /api/v7/projects | Liste aller Projekte |
| POST /api/v7/projects | Neues Projekt |
| PUT /api/v7/projects/[id] | Projekt aktualisieren |

### 8.4 Zeiterfassung

| Endpunkt | Beschreibung |
|----------|--------------|
| GET /api/v7/timesheets | Zeiteinträge |
| POST /api/v7/timesheets/bulk | Bulk-Update |

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
| AS System GmbH | Thomas Dührkop | ✓ active |
| Tippl GmbH | Mario Tippl | ✓ active |

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
| **v7.3.33-dev** | **19.01.2026** | **Firmendaten-Bearbeitung auf Detailseite** |
| v7.3.32-dev | 20.01.2026 | Mitarbeiter-/Berichte-Seiten |
| v7.3.12-dev | 08.01.2026 | Zeiterfassung komplett |
| v7.3.3-dev | 07.01.2026 | Header-Vereinheitlichung, Ozeanblau |
| v7.3.2-dev | 06.01.2026 | Firmendaten + Logo-Upload |
| v7.3.1-dev | 06.01.2026 | Header-Design (Blau/Grün) |
| v7.3.0-dev | 06.01.2026 | Firmen-Portal Sprint 1 |

---

## 12. Offene ToDos

### 12.1 Phase 3 - v7.3.33 (Aktuell)

| ToDo | Beschreibung | Priorität |
|------|--------------|-----------|
| **Firmendaten-Bearbeitung** | Modal mit allen Feldern auf Detailseite | **Hoch** |
| **Förderrelevante Felder** | KMU-Status, Gründungsjahr, etc. | **Hoch** |
| **DB-Migration** | Neue Spalten in client_companies | **Hoch** |
| **Statistik bereinigen** | Aus Berater-Portal Kundenfirmen entfernen | Mittel |

### 12.2 Phase 3 - Restliche Arbeiten

| ToDo | Beschreibung | Priorität |
|------|--------------|-----------|
| Wording projektartspezifisch | "förderbare Projektarbeiten" (Standard) vs "Management-Arbeiten" (Netzwerk) | Mittel |
| Projekte verwalten | /v7/firma/projekte - Eigene Projekte sehen | Mittel |
| Mitarbeiter verwalten | /v7/firma/mitarbeiter - MA-Stammdaten pflegen | Mittel |
| Berichte | /v7/firma/berichte - Exports, Übersichten | Niedrig |

### 12.3 Phase 4 - FZul-Migration

| ToDo | Beschreibung | Priorität |
|------|--------------|-----------|
| FZul-Datenbank-Tabellen | fzul_employee_settings, fzul_timesheets, fzul_pdf_archive | Hoch |
| MA-Stammdaten UI | Tab "MA-Daten" im Import-Modul | Hoch |
| FZul-Editor | Wizard, Kalender-Raster, Tages-Editor, Auto-Fill | Hoch |
| PDF-Generierung | BMF-konformer Jahres-Stundennachweis | Hoch |
| PDF-Archiv | Status-Workflow, ZIP-Download | Mittel |

### 12.4 Phase 5 - Produktion

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
| **Workflow** | Bearbeitung dort, wo Daten angezeigt werden |

---

## 14. Änderungshistorie

### 14.1 Pflichtenheft-Versionen

| PH-Version | SW-Release | Datum | Änderungen |
|------------|------------|-------|------------|
| **v4.12** | **V7.3** | **19.01.2026** | **Firmendaten-Bearbeitung auf Detailseite, förderrelevante Felder, DB-Migration v7.3.33** |
| v4.11 | V7.3 | 20.01.2026 | Farbcode Berater-Portal korrigiert (#0369a1), UTF-8 bereinigt, v7.3.32 |
| v4.10 | V7.3 | 18.01.2026 | PM-Kategorie für Meta-Arbeit, Projektplan v1.5 |
| v4.9 | V7.3 | 18.01.2026 | Entwicklungsphasen-Kapitel, Konsistenz mit Projektplan |
| v4.8 | V7.3 | 08.01.2026 | Zeiterfassung v7.3.12 dokumentiert |
| v4.7 | V7.3 | 07.01.2026 | Versionierungskonzept, Header-Vereinheitlichung |
| v4.6 | V7.3 | 06.01.2026 | Firmen-Portal Sprint 1, Logo-Upload |
| v4.5 | V7.2 | 05.01.2026 | ZIM-Import, Arbeitspakete |
| v4.4 | V7.1 | 04.01.2026 | Firmen-Detailseite CRUD |
| v4.3 | V7.1 | 03.01.2026 | Rollenbasierte Navigation |

### 14.2 SW-Release-Historie

| SW-Release | Datum | Hauptfeatures |
|------------|-------|---------------|
| **V7.3** | **19.01.2026** | **v7.3.33: Firmendaten-Bearbeitung auf Detailseite mit förderrelevanten Feldern** |
| V7.3 | 20.01.2026 | v7.3.32: Mitarbeiter-/Berichte-Seiten, UTF-8-Bereinigung, Header-Korrektur |
| V7.3 | 08.01.2026 | Zeiterfassung komplett (v7.3.12) |
| V7.3 | 07.01.2026 | Header-Design, Firmen-Portal, Logo-Upload |
| V7.2 | 05.01.2026 | ZIM-Import funktional |
| V7.1 | 02.01.2026 | Berater-Portal CRUD komplett |
| V7.0 | 27.12.2025 | Berater-Portal Grundstruktur |
| V6.7 | 20.12.2025 | Letzte stabile V6 (FZul-Analyse) |
| V1-V5 | Okt-Nov 2025 | Prototypen und Konzepterprobung |

### 14.3 Zugehörige Dokumente

| Dokument | Version | Beschreibung |
|----------|---------|--------------|
| **KONZEPT-FIRMEN-DETAILSEITE-BEARBEITUNG** | v7.3.33 | Detailkonzept Firmendaten-Bearbeitung |
| PZE-V7-PROJEKTPLAN | v1.2 | Detaillierter Arbeitsplan mit Plan/Ist-Aufwänden |
| V7-DB-SCHEMA.sql | - | Datenbank-Schema Referenz |
| KONZEPT-FZUL-ONLINE-EDITOR.md | - | FZul-Editor Konzept (Phase 4) |
| KONZEPT-FIRMEN-HIERARCHIE-v7_1.md | - | Berater/Kunden-Architektur |

---

**Erstellt:** 19. Januar 2026  
**Autor:** Claude AI / Martin Ditscherlein  
**Kontakt:** m.ditscherlein@cubintec.com
