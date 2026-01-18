# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.10  
**SW-Release:** V7.3  
**Datum:** 18. Januar 2026  
**Projekt:** Projektzeiterfassung fÃ¼r FuE-FÃ¶rdervorhaben  
**Status:** V7 Entwicklung - Phase 3 (Firmen-Portal)

---

## 1. Projektstatus Ãœbersicht

### 1.1 Versionen

| Version | Status | Beschreibung |
|---------|--------|--------------|
| **V6** | âœ… Produktion | Stabile Version auf main-Branch (FZul-Analyse) |
| **V7** | ðŸ”§ Entwicklung | Berater-Portal + Firmen-Portal auf v7-dev |

### 1.2 Aktueller Stand V7

| Komponente | Status | Version |
|------------|--------|---------|
| Berater-Portal | âœ… Funktional | v7.3.3 |
| Firmen-Portal | âœ… Grundfunktionen | v7.3.5 |
| **Zeiterfassung** | âœ… **Fertig** | **v7.3.12** |
| FZul-Migration | â³ Ausstehend | Phase 4 |

---

## 2. Entwicklungsphasen

### 2.1 PhasenÃ¼bersicht

Die Entwicklung von PZE gliedert sich in 5 Hauptphasen plus Projektmanagement. **Phase 0** umfasst die V6-Vorarbeit (Okt 2025 - Dez 2025), die als Grundlage für V7 dient. Die **Phasen 1-5** beschreiben die V7-Entwicklung (seit Dez 2025). **PM** erfasst phasenübergreifende Meta-Arbeit am Projekt selbst.

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  PHASE 0: V6-VORARBEIT (Okt-Dez 2025)                              âœ… FERTIG â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚
â”‚  Grundlagen, die in V7 Ã¼bernommen wurden:                                   â”‚
â”‚  â€¢ Datenmodell (Projekte, MA, Arbeitspakete, Zeiterfassung)                â”‚
â”‚  â€¢ FZul-Analyse-Logik (KapazitÃ¤tsberechnung, Stundenverteilung)            â”‚
â”‚  â€¢ Excel-Import (ZIM/BMBF-Stundennachweise)                                 â”‚
â”‚  â€¢ PDF-Export (FZul-Jahres-Stundennachweis)                                 â”‚
â”‚  â€¢ UI/UX-Konzepte (Kalender-Raster, Tages-Editor)                          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚
        â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  PHASE 1: BASIS-INFRASTRUKTUR (Dez 2025 - Jan 2026)                âœ… FERTIG â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚
â”‚  â€¢ V7-Datenbank-Schema (Berater/Kunden-Hierarchie)                         â”‚
â”‚  â€¢ Login & Authentifizierung (Supabase Auth)                                â”‚
â”‚  â€¢ Rollenbasierter Redirect (Beraterâ†’Portal, Firmaâ†’Portal)                 â”‚
â”‚  â€¢ Berater-Dashboard Grundstruktur                                          â”‚
â”‚  â€¢ Navigation & Header-Design (Blau/GrÃ¼n-Schema)                           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚
        â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  PHASE 2: BERATER-PORTAL (Jan 2026)                                âœ… FERTIG â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚
â”‚  2a) CRUD-Funktionen:                                                       â”‚
â”‚      â€¢ FirmenÃ¼bersicht, Firma anlegen/bearbeiten, Logo-Upload              â”‚
â”‚      â€¢ Firmen-Detailseite (Projekte, MA, APs)                              â”‚
â”‚      â€¢ Projekt/Mitarbeiter/Arbeitspaket CRUD                               â”‚
â”‚      â€¢ MA â†’ Projekt und MA â†’ AP Zuordnung                                  â”‚
â”‚                                                                             â”‚
â”‚  2b) ZIM-PDF-Import:                                                        â”‚
â”‚      â€¢ Python PDF-Parser (PyMuPDF)                                          â”‚
â”‚      â€¢ Railway Microservice                                                 â”‚
â”‚      â€¢ Import-UI mit Vorschau                                               â”‚
â”‚      â€¢ Automatischer Reimport                                               â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚
        â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  PHASE 3: FIRMEN-PORTAL (Jan 2026)                              ðŸ”„ IN ARBEIT â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚
â”‚  âœ… Erledigt:                                                               â”‚
â”‚      â€¢ Firmen-Dashboard mit Statistiken                                     â”‚
â”‚      â€¢ Zeiterfassung komplett (v7.3.12)                                     â”‚
â”‚        - Excel-Ã¤hnliche Navigation                                          â”‚
â”‚        - PDF-Export mit Auto-Filename                                       â”‚
â”‚        - Bundesland-Feiertage                                               â”‚
â”‚                                                                             â”‚
â”‚  â³ Offen:                                                                   â”‚
â”‚      â€¢ Projekte verwalten (/firma/projekte)                                 â”‚
â”‚      â€¢ Mitarbeiter verwalten (/firma/mitarbeiter)                           â”‚
â”‚      â€¢ Berichte (/firma/berichte)                                           â”‚
â”‚      â€¢ Wording projektartspezifisch (Netzwerk vs Standard)                  â”‚
â”‚      â€¢ Header-Farbe Firmen-Detailseite (Berater-Portal)                    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚
        â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  PHASE 4: FZUL-MIGRATION (geplant)                                 â³ OFFEN â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚
â”‚  Migration der V6-FZul-Funktionen nach V7:                                  â”‚
â”‚      â€¢ FZul-Datenbank-Tabellen (fzul_employee_settings, etc.)              â”‚
â”‚      â€¢ MA-Stammdaten UI                                                     â”‚
â”‚      â€¢ FZul-Editor (Wizard, Kalender-Raster, Tages-Editor)                 â”‚
â”‚      â€¢ PDF-Generierung BMF-konform                                          â”‚
â”‚      â€¢ PDF-Archiv & Freigabe-Workflow                                       â”‚
â”‚                                                                             â”‚
â”‚  Basis: V6-FZul-Analyse (bewÃ¤hrte Logik wird Ã¼bernommen)                   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚
        â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  PHASE 5: PRODUKTION (geplant)                                     â³ OFFEN â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚
â”‚      â€¢ RLS-Policies aktivieren (Row Level Security)                         â”‚
â”‚      â€¢ DSGVO-Autorisierung (Berater-Zugriff durch GF)                      â”‚
â”‚      â€¢ Multi-Mandanten-FÃ¤higkeit (weitere Beraterfirmen)                   â”‚
â”‚      â€¢ Performance-Optimierung (Indizes, Caching)                          â”‚
â”‚      â€¢ Dokumentation & Schulung (Benutzerhandbuch)                         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
┌─────────────────────────────────────────────────────────────────────────────┐
│  PM: PROJEKTMANAGEMENT - META-ARBEIT (phasenübergreifend)                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Arbeit am Projekt selbst, nicht an der PZE-Software:                       │
│      • Projektplanung und -steuerung                                        │
│      • Aufwandsanalyse (Plan/Ist-Vergleich, KI vs klassisch)               │
│      • Konzeption Projekttracking-System                                    │
│      • Dokumentation (Pflichtenheft, Projektplan)                          │
│      • Eigenverbrauchsberechnung (FZul für eigenes Projekt)                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 V6-Vorarbeit (Phase 0) - Was wurde Ã¼bernommen?

**Hinweis zur Versionierung:** Die Versionen V1-V5 (Okt-Nov 2025) waren explorative Prototypen und Gehversuche, in denen Grundkonzepte erprobt wurden. V6 war die erste produktiv nutzbare Version, die auf dem main-Branch deployed wurde. Die V7-Entwicklung baut auf den Erkenntnissen aller Vorversionen auf.

Die V6-Entwicklung (Oktober - Dezember 2025) hat wichtige Grundlagen geschaffen:

| V6-Feature | Ãœbernahme in V7 | Status |
|------------|-----------------|--------|
| Datenmodell (Projekte, MA, APs) | â†’ V7-Schema mit Berater-Hierarchie | âœ… Ãœbernommen |
| Excel-Import (ZIM/BMBF) | â†’ Wird in Phase 4 migriert | â³ Geplant |
| FZul-Analyse-Logik | â†’ Wird in Phase 4 migriert | â³ Geplant |
| PDF-Export (Stundennachweis) | â†’ Neu implementiert in v7.3.12 | âœ… Neu gebaut |
| Kalender-Raster UI | â†’ Wird in Phase 4 Ã¼bernommen | â³ Geplant |
| KapazitÃ¤tsberechnung | â†’ Wird in Phase 4 Ã¼bernommen | â³ Geplant |

**Wichtig:** V6 bleibt auf dem `main`-Branch produktiv nutzbar, bis V7 alle Funktionen Ã¼bernommen hat.

### 2.3 Phasen-Details mit Arbeitspaketen

Die detaillierte AufschlÃ¼sselung aller Arbeitspakete ist im separaten Dokument **PZE-V7-PROJEKTPLAN-v1.x.xlsx** gepflegt. Der Projektplan enthÃ¤lt:

- Hierarchische Nummerierung (1, 1.1, 1.2, ... wie bei FÃ¶rderprojekten)
- Plan-Aufwand (Stunden bei externer Vergabe)
- Ist-Aufwand (tatsÃ¤chlicher Aufwand mit Claude AI)
- Status (âœ… Fertig / ðŸ”„ In Arbeit / â³ Offen)
- Version und Datum der Fertigstellung

---

## 3. Versionierungskonzept

### 3.1 Schema

```
Datei-Version:  v[Release].[Ã„nderungsschritt]
Beispiel:       v7.3.12 = Release 7.3, 12. Ã„nderung in diesem Release
```

### 3.2 Regeln

| Element | Format | Beschreibung |
|---------|--------|--------------|
| **SW-Release** | V7.3 | Hauptversion des Gesamtsystems |
| **Datei-Version** | v7.3.12 | Release + Ã„nderungsschritt dieser Datei |
| **PH-Version** | 4.9 | Pflichtenheft-Dokumentversion |

**WICHTIG:** Jede funktionale Ã„nderung = neue Versionsnummer!

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
    â””â”€â”€ Berater (consultant)
            â””â”€â”€ betreut mehrere Kundenfirmen
                    
Kunden-Firma (z.B. AS System GmbH)
    â”œâ”€â”€ Firmen-Admin (client_admin) - z.B. GeschÃ¤ftsfÃ¼hrer
    â”œâ”€â”€ Projektleiter (project_leader)
    â””â”€â”€ Mitarbeiter (employee)
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
| Firmen-Portal | Cubintec-GrÃ¼n | `#65A655` | Header zeigt "Ich bin Firma" |

**Regel:** Die Header-Farbe zeigt immer an, **wer eingeloggt ist** - nicht welche Daten man gerade sieht.

---

## 5. Header-Design (v7.3.3)

### 5.1 Einheitliches Layout

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ [â† ZurÃ¼ck]   [PZE]   Seitentitel                    Benutzer [Abmelden]     â”‚
â”‚                      Untertitel                                             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 5.2 Regeln

| Element | Position | Immer gleich? |
|---------|----------|---------------|
| â† ZurÃ¼ck | Links | âœ… Ja (auÃŸer Hauptseiten) |
| PZE Badge | Nach ZurÃ¼ck | âœ… Ja |
| Seitentitel | Mitte-Links | âœ… Ja |
| Benutzername | Rechts | âœ… Ja |
| Abmelden | Ganz rechts | âœ… Ja |
| **Aktions-Buttons** | **NIE im Header** | âœ… In Content-Bereich |

### 5.3 Seiten-Titel

| Seite | ZurÃ¼ck? | Titel | Untertitel |
|-------|---------|-------|------------|
| Berater Dashboard | Nein | Berater-Portal | v7 |
| FÃ¶rderberatung | â†’ Dashboard | Berater-Portal | FÃ¶rderberatung Â· ZIM / BMBF |
| FZul-Beratung | â†’ Dashboard | Berater-Portal | FZul-Beratung Â· Â§35a EStG |
| Firmen-Detail | â†’ FÃ¶rderberatung | {Firmenname} | FÃ¶rderberatung Â· {Bundesland} |
| Firmen-Portal | Nein | Firmen-Portal | {Firmenname} |
| Zeiterfassung | â†’ Dashboard | Stundennachweis | - |

---

## 6. Datenbank-Schema V7

### 6.1 Haupttabellen

| Tabelle | Beschreibung |
|---------|--------------|
| `v7_consultant_companies` | Beraterfirmen |
| `v7_client_companies` | Kundenfirmen |
| `v7_user_profiles` | Benutzerprofile mit Rollen |
| `v7_projects` | FÃ¶rderprojekte |
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
| `invitation_token` | UUID | FÃ¼r Selbst-Registrierung |
| `logo_url` | TEXT | Pfad zum Firmenlogo |
| `vat_id` | TEXT | USt-ID |
| `website` | TEXT | Firmenwebsite |
| `legal_name` | TEXT | VollstÃ¤ndiger juristischer Name |
| `federal_state` | TEXT | Bundesland fÃ¼r Feiertage |

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
| ZIM_DS | ZIM DurchfÃ¼hrbarkeitsstudie | **Ja** |
| BMBF | BMBF FÃ¶rderung | Nein |
| BMBF_DS | BMBF DurchfÃ¼hrbarkeitsstudie | **Ja** |

### 6.4 Storage

| Bucket | Zweck | Public |
|--------|-------|--------|
| `company-logos` | Firmenlogos | âœ… Ja |

---

## 7. Implementierte Features

### 7.1 Berater-Portal (`/v7/berater/`)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Dashboard | âœ… | Statistiken, Navigation zu FÃ¶rder-/FZul-Beratung |
| FirmenÃ¼bersicht | âœ… | Liste aller Kundenfirmen mit Status |
| Firma anlegen | âœ… | Modal mit optionaler Admin-Erstellung |
| Firma bearbeiten | âœ… | Alle Stammdaten |
| Status-System | âœ… | invited â†’ registered â†’ active |
| Firmen-Detailseite | âœ… | Projekte, Mitarbeiter, Arbeitspakete |
| ZIM-Import | âœ… | PDF-Parser via Railway-Service |
| Projekt-CRUD | âœ… | Anlegen, Bearbeiten, LÃ¶schen |
| Mitarbeiter-CRUD | âœ… | Anlegen, Bearbeiten, LÃ¶schen |
| Arbeitspaket-CRUD | âœ… | Anlegen, Bearbeiten, LÃ¶schen |
| FZul-Beratung | âœ… | Firmenauswahl fÃ¼r FZul-Analyse |

### 7.2 Firmen-Portal (`/v7/firma/`)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Dashboard | âœ… | Willkommen, Statistiken, Navigation |
| Firmendaten anzeigen | âœ… | 3-Spalten-Layout (Logo, Adresse, Kontakt) |
| Firmendaten bearbeiten | âœ… | Modal mit allen Feldern |
| Logo-Upload | âœ… | Supabase Storage |
| **Zeiterfassung** | âœ… | **v7.3.12 - Stundennachweis komplett** |
| Projekte verwalten | â³ | Phase 3 |
| Mitarbeiter verwalten | â³ | Phase 3 |
| Berichte | â³ | Phase 3 |

### 7.3 Zeiterfassung (v7.3.12)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Stundennachweis-Formular | âœ… | Excel-konformes Layout |
| Header 2x3 Layout | âœ… | ZuwendungsempfÃ¤nger, Vorhabenthema, Monat, FKZ, Mitarbeiter |
| Kalender-Eingabe | âœ… | 31 Tage, WE/Feiertage markiert |
| 4+ AP-Zeilen | âœ… | Dynamisch erweiterbar |
| Fehlzeiten | âœ… | U=Urlaub, K=Krankheit, S=Sonstige |
| T-Spalte | âœ… | Nur bei DurchfÃ¼hrbarkeitsstudien |
| Excel-Navigation | âœ… | â† â†’ â†‘ â†“ Tab Shift+Tab Enter |
| PDF-Export | âœ… | Mit Speicherdialog, Dateiname automatisch |
| Drucken | âœ… | A4 Landscape, alles auf einer Seite |
| Unterschriften | âœ… | Senkrechte Trennlinie, Datum editierbar |
| Bundesland-Feiertage | âœ… | Automatisch aus Firmendaten |

### 7.4 Login & Routing

| Feature | Status |
|---------|--------|
| Rollenbasierter Redirect | âœ… |
| V6/V7 Koexistenz | âœ… |
| Bestehende V6-User â†’ V7 | âœ… (manuell via SQL) |

---

## 8. URL-Struktur

### 8.1 Berater-Portal

```
/v7/berater/                           # Dashboard
/v7/berater/foerderung/                # FirmenÃ¼bersicht
/v7/berater/foerderung/firma/[id]/     # Firmen-Detailseite
/v7/berater/foerderung/import/         # ZIM-Import
/v7/berater/fzul/                      # FZul-Firmenauswahl
/v7/berater/fzul/firma/[id]/           # FZul-Analyse (Phase 4)
```

### 8.2 Firmen-Portal

```
/v7/firma/                             # Dashboard
/v7/firma/zeiterfassung/               # âœ… Stundennachweis (v7.3.12)
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
| UnterstÃ¼tzt | ZIM-Formulare ab 2022 (cg_VMS_*) |

---

## 10. Testdaten V7

### 10.1 Beraterfirma

| Firma | ID |
|-------|-----|
| Cubintec GmbH | (consultant_company_id) |

### 10.2 Kundenfirmen

| Firma | Admin | Status |
|-------|-------|--------|
| AS System GmbH | Thomas DÃ¼hrkop | âœ… active |
| Tippl GmbH | Mario Tippl | âœ… active |

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
| v7.3.1-dev | 06.01.2026 | Header-Design (Blau/GrÃ¼n) |
| v7.3.0-dev | 06.01.2026 | Firmen-Portal Sprint 1 |

---

## 12. Offene ToDos

### 12.1 Phase 3 - Noch offen

| ToDo | Beschreibung | PrioritÃ¤t |
|------|--------------|-----------|
| Wording projektartspezifisch | "fÃ¶rderbare Projektarbeiten" (Standard) vs "Management-Arbeiten" (Netzwerk) | Mittel |
| Firmen-Detailseite Header | Berater-Portal: Header-Farbe auf blau (#002451) Ã¤ndern | Niedrig |
| Projekte verwalten | /v7/firma/projekte - Eigene Projekte sehen | Mittel |
| Mitarbeiter verwalten | /v7/firma/mitarbeiter - MA-Stammdaten pflegen | Mittel |
| Berichte | /v7/firma/berichte - Exports, Ãœbersichten | Niedrig |

### 12.2 Phase 4 - FZul-Migration

| ToDo | Beschreibung | PrioritÃ¤t |
|------|--------------|-----------|
| FZul-Datenbank-Tabellen | fzul_employee_settings, fzul_timesheets, fzul_pdf_archive | Hoch |
| MA-Stammdaten UI | Tab "MA-Daten" im Import-Modul | Hoch |
| FZul-Editor | Wizard, Kalender-Raster, Tages-Editor, Auto-Fill | Hoch |
| PDF-Generierung | BMF-konformer Jahres-Stundennachweis | Hoch |
| PDF-Archiv | Status-Workflow, ZIP-Download | Mittel |

### 12.3 Phase 5 - Produktion

| ToDo | Beschreibung | PrioritÃ¤t |
|------|--------------|-----------|
| RLS-Policies | Row Level Security aktivieren | Hoch |
| DSGVO-Autorisierung | Berater-Zugriff durch GF freigeben | Hoch |
| Multi-Mandanten | Weitere Beraterfirmen ermÃ¶glichen | Mittel |
| Performance | Indizes, Caching optimieren | Niedrig |
| Dokumentation | Benutzerhandbuch erstellen | Niedrig |

---

## 13. Design-Prinzipien

> "So einfach und einheitlich wie mÃ¶glich" - Nokia 2110 / Apple

| Prinzip | Umsetzung |
|---------|-----------|
| **Konsistenz** | Immer Modals fÃ¼r Bearbeitung, einheitlicher Header |
| **Klarheit** | Header-Farbe = wer bin ICH (nicht was sehe ich) |
| **Einfachheit** | Wenige Klicks zum Ziel, keine Aktions-Buttons im Header |
| **Intuition** | Stift-Icon = Bearbeiten, ZurÃ¼ck immer links |
| **Excel-Ã¤hnlich** | Zeiterfassung navigierbar wie Tabellenkalkulation |

---

## 14. Ã„nderungshistorie

### 14.1 Pflichtenheft-Versionen

| PH-Version | SW-Release | Datum | Ã„nderungen |
|------------|------------|-------|------------|
| **v4.10** | **V7.3** | **18.01.2026** | **PM-Kategorie für Meta-Arbeit, Projektplan v1.5** |
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
| **V7.3** | **08.01.2026** | **Zeiterfassung komplett (v7.3.12)** |
| V7.3 | 07.01.2026 | Header-Design, Firmen-Portal, Logo-Upload |
| V7.2 | 05.01.2026 | ZIM-Import funktional |
| V7.1 | 02.01.2026 | Berater-Portal CRUD komplett |
| V7.0 | 27.12.2025 | Berater-Portal Grundstruktur |
| V6.7 | 20.12.2025 | Letzte stabile V6 (FZul-Analyse) |
| V1-V5 | Okt-Nov 2025 | Prototypen und Konzepterprobung |

### 14.3 ZugehÃ¶rige Dokumente

| Dokument | Version | Beschreibung |
|----------|---------|--------------|
| **PZE-V7-PROJEKTPLAN** | v1.2 | Detaillierter Arbeitsplan mit Plan/Ist-AufwÃ¤nden |
| V7-DB-SCHEMA.sql | - | Datenbank-Schema Referenz |
| KONZEPT-FZUL-ONLINE-EDITOR.md | - | FZul-Editor Konzept (Phase 4) |
| KONZEPT-FIRMEN-HIERARCHIE-v7_1.md | - | Berater/Kunden-Architektur |

---

**Erstellt:** 18. Januar 2026  
**Autor:** Claude AI / Martin Ditscherlein  
**Kontakt:** m.ditscherlein@cubintec.com
