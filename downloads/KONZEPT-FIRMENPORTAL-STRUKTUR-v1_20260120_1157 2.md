# KONZEPT: Firmenportal-Struktur und Navigation

**Version:** 1.0  
**Datum:** 21. Januar 2026  
**Projekt:** PZE - Projektzeiterfassung für FuE-Fördervorhaben  
**Status:** Entwurf zur Abstimmung

---

## 1. Zielsetzung

Dieses Konzept beschreibt die Struktur und Navigation des Firmenportals. Es definiert:

1. **Landingpage** nach Login für Firmenkunden
2. **Navigationsstruktur** und Seitenhierarchie
3. **Abgrenzung** zum Beraterportal
4. **Gemeinsame Komponenten** für beide Portale

---

## 2. Portal-Übersicht

### 2.1 Zwei getrennte Portale

| Aspekt | Beraterportal | Firmenportal |
|--------|---------------|--------------|
| **Zielgruppe** | Fördermittelberater (z.B. Cubintec GmbH) | Kundenfirmen (z.B. Tippl GmbH) |
| **Header-Farbe** | Blau (#0369a1) | Grün (#65A655) |
| **Sicht** | Alle betreuten Firmen | Nur eigene Firma |
| **URL-Basis** | `/v7/berater/...` | `/v7/firma/...` |
| **Rollen** | system_admin, consultant | client_admin, client_user (mit portal_role) |

### 2.2 Farbschema-Regel

> **Die Header-Farbe zeigt immer an, WER eingeloggt ist - nicht welche Daten man sieht.**

- Berater sieht Daten von Tippl GmbH → Header bleibt **BLAU** (er ist Berater)
- Tippl-Mitarbeiter sieht seine Firmendaten → Header ist **GRÜN** (er ist Firma)

### 2.3 Rollen-Gesamtübersicht

```
CUBINTEC (Berater-Portal - Blau)
═══════════════════════════════════════════════════════════════
├── system_admin (z.B. Martin Ditscherlein)
│   └── Kann: ALLES + weitere system_admin und consultant anlegen
│
└── consultant (z.B. Katrin Kirchner, weitere Berater)
    └── Kann: Kundenfirmen betreuen, Projekte/MA verwalten
    └── Kann NICHT: Berater (system_admin/consultant) anlegen

KUNDENFIRMA z.B. Tippl GmbH (Firmen-Portal - Grün)
═══════════════════════════════════════════════════════════════
├── client_admin (Geschäftsführer, Prokurist)
│   └── Kann: Alles in eigener Firma + Projektleiter festlegen
│
├── project_leader (pro Projekt vom client_admin festgelegt)
│   └── Kann: Zugeordnete Projekte bearbeiten, Team-Zeiten sehen
│   └── Kann NICHT: Neue MA anlegen, andere Projekte sehen
│
└── employee (Mitarbeiter)
    └── Kann: Nur eigene Zeiterfassung, nur zugeordnete Projekte sehen
```

### 2.4 Wer kann wen anlegen?

| Rolle | Kann anlegen... |
|-------|-----------------|
| `system_admin` | `system_admin`, `consultant`, `client_admin`, `client_user` |
| `consultant` | `client_admin`, `client_user` (nur für betreute Firmen) |
| `client_admin` | `client_user` (nur in eigener Firma) |
| `project_leader` | Niemanden |
| `employee` | Niemanden |

---

## 3. Firmenportal-Struktur

### 3.1 Seitenhierarchie

```
/v7/firma/
│
├── /dashboard                    ← Landingpage nach Login
│   └── Kacheln: Firmendaten | Projekte | Mitarbeiter
│
├── /firmendaten                  ← Stammdaten der eigenen Firma
│   └── Anzeige + Bearbeitung
│
├── /mitarbeiter                  ← Zentrale Mitarbeiterverwaltung
│   ├── Liste aller Mitarbeiter
│   ├── Anlegen / Bearbeiten / Löschen
│   └── Kapazitätsübersicht
│
├── /projekte                     ← Projektübersicht
│   └── Liste aller Projekte der Firma
│
├── /projekte/[id]                ← Projekt-Detailseite
│   ├── Antragsdaten (FKZ, Förderformat, Laufzeit)
│   ├── Arbeitspakete (AP1, AP1.1, AP2, ...)
│   ├── Mitarbeiter-Zuordnung zu APs
│   └── Zeiterfassung / Stundenübersicht
│
├── /zeiterfassung                ← Zeiterfassung (eigene oder Team)
│   └── Stundenerfassung pro Mitarbeiter/Projekt/AP
│
└── /berichte                     ← Auswertungen
    ├── Stundennachweise
    ├── Projektfortschritt
    └── Kapazitätsauslastung
```

### 3.2 Rollen und Berechtigungen

| Seite | client_admin | project_leader | employee |
|-------|--------------|----------------|----------|
| Dashboard | ✅ Vollzugriff | ✅ Vollzugriff | ✅ Eingeschränkt |
| Firmendaten | ✅ Bearbeiten | 👁️ Nur lesen | ❌ Kein Zugriff |
| Mitarbeiter (Stammdaten) | ✅ CRUD (anlegen/bearbeiten/löschen) | 👁️ Nur zugeordnete lesen | ❌ Kein Zugriff |
| Projekte (Liste) | ✅ Alle sehen | ✅ Nur zugeordnete | ✅ Nur zugeordnete |
| Projekte anlegen | ✅ Ja | ❌ Nein | ❌ Nein |
| Projekt bearbeiten | ✅ Ja | ✅ Ja (nur zugeordnete) | ❌ Nein |
| **Team-Zuordnung** | ✅ Ja (MA → Projekt zuordnen) | ❌ Nein | ❌ Nein |
| **Projektleiter festlegen** | ✅ Ja | ❌ Nein | ❌ Nein |
| Zeiterfassung | ✅ Alle MA sehen/bearbeiten | ✅ Team sehen/bearbeiten | ✅ Nur eigene |
| Berichte | ✅ Alle | ✅ Team | ✅ Nur eigene |

**Zusammenfassung der Rollen:**

| Rolle | Beschreibung | Typische Person |
|-------|--------------|-----------------|
| **client_admin** | Firmen-Administrator mit Vollzugriff, legt Projekte an, ordnet Teams zu, bestimmt Projektleiter | Geschäftsführer, Prokurist |
| **project_leader** | Kann zugeordnete Projekte bearbeiten, sieht nur sein Team und dessen Zeiten | Projektleiter, Abteilungsleiter |
| **employee** | Kann nur eigene Zeiterfassung bearbeiten, sieht nur zugeordnete Projekte | Entwickler, Techniker |

### 3.3 Team-Zuordnung (Workflow)

**Wichtig:** Die Zuordnung von Mitarbeitern zu Projekten erfolgt durch den **client_admin**:

```
WORKFLOW: Projekt-Team zusammenstellen
═══════════════════════════════════════════════════════════════

1. client_admin legt Projekt an
   └── Projekt "Smarte Sensortechnik" erstellt

2. client_admin ordnet Mitarbeiter dem Projekt zu
   └── Max Müller → Projekt "Smarte Sensortechnik" (als Entwickler)
   └── Lisa Schmidt → Projekt "Smarte Sensortechnik" (als Projektleiterin)
   └── Tom Weber → Projekt "Smarte Sensortechnik" (als Techniker)

3. client_admin legt Projektleiter fest
   └── Lisa Schmidt wird project_leader für dieses Projekt

4. Ergebnis:
   └── Lisa (project_leader) sieht: Max, Tom und sich selbst
   └── Lisa kann: Projekt bearbeiten, APs verwalten, Team-Zeiten sehen
   └── Lisa kann NICHT: Neue Mitarbeiter anlegen, andere Projekte sehen
```

**Wo im System?**

| Funktion | Ort im System | Wer kann es |
|----------|---------------|-------------|
| Mitarbeiter anlegen | `/v7/firma/mitarbeiter` → [+ Neu] | client_admin |
| Projekt anlegen | `/v7/firma/projekte` → [+ Neu] | client_admin |
| Team zuordnen | `/v7/firma/projekte/[id]` → Tab "Team" → [+ Mitarbeiter] | client_admin |
| Projektleiter festlegen | `/v7/firma/projekte/[id]` → Tab "Team" → Rolle ändern | client_admin |

---

## 4. Rollenspezifische Ansichten nach Login

### 4.1 Grundprinzip: Jeder sieht nur was er braucht

Nach dem Login sieht jede Rolle eine **angepasste Oberfläche**:

| Rolle | Sieht | Sieht NICHT |
|-------|-------|-------------|
| `client_admin` | Alles der eigenen Firma | Andere Firmen |
| `project_leader` | Nur zugeordnete Projekte + deren Mitarbeiter | Andere Projekte, Firmendaten, nicht zugeordnete MA |
| `employee` | Nur eigene zugeordnete Projekte + eigene Zeiterfassung | Andere Projekte, andere MA, Firmendaten |

### 4.2 Landingpage: client_admin (Geschäftsführer)

**Voller Zugriff auf alles in der eigenen Firma:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [FIRMEN-LOGO]         Tippl GmbH              👤 Hans Geschäftsf. │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Dashboard   Firmendaten   Projekte   Mitarbeiter   Berichte        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Willkommen, Hans Geschäftsführer!                                  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │       🏢         │  │       📁         │  │       👥         │  │
│  │   FIRMENDATEN    │  │    PROJEKTE      │  │   MITARBEITER    │  │
│  │   bearbeiten     │  │   3 aktive       │  │   12 Personen    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  📊 Firmenübersicht: Alle Projekte, alle Mitarbeiter, Auslastung   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Navigation:** Dashboard | Firmendaten | Projekte | Mitarbeiter | Berichte

### 4.3 Landingpage: project_leader (Projektleiter)

**Sieht nur zugeordnete Projekte und deren Team-Mitglieder:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [FIRMEN-LOGO]         Tippl GmbH                 👤 Lisa Schmidt  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Meine Projekte   Zeiterfassung   Berichte                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Willkommen, Lisa Schmidt!                                          │
│  Projektleiterin                                                    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 📁 MEINE PROJEKTE                                            │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │                                                              │  │
│  │  Smarte Sensortechnik (ZIM)         3 Mitarbeiter    →      │  │
│  │  FKZ: 16KN087520                    12 PM geplant           │  │
│  │                                                              │  │
│  │  KI-Optimierung (BMBF)              2 Mitarbeiter    →      │  │
│  │  FKZ: 01LY1925A                     8 PM geplant            │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  📊 Team-Übersicht: Zeiterfassung meiner Projekte                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Navigation:** Meine Projekte | Zeiterfassung | Berichte
**KEINE:** Firmendaten, Mitarbeiter (zentral), andere Projekte

### 4.4 Landingpage: employee (Mitarbeiter)

**Sieht eigene Projekte, eigene Zeiterfassung und eigenen Status:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [FIRMEN-LOGO]         Tippl GmbH                   👤 Max Müller  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Meine Projekte   Meine Zeiterfassung   Mein Status                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Willkommen, Max Müller!                                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 📁 MEINE PROJEKTE                                            │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │                                                              │  │
│  │  Smarte Sensortechnik                                        │  │
│  │  └── AP1.1 Anforderungsanalyse      1,5 PM geplant          │  │
│  │  └── AP2 Entwicklung                4,0 PM geplant          │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 🕐 ZEITERFASSUNG Januar 2026                    [Öffnen →]  │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  Erfasst: 45 h    Offen: 128 h    Status: ⚠️ Unvollständig  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 📊 MEIN STATUS                                               │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │                                                              │  │
│  │  Projekt             │ Geplant │ Erfasst │ Offen │ Status   │  │
│  │  ────────────────────┼─────────┼─────────┼───────┼────────  │  │
│  │  Smarte Sensortechnik│ 5,5 PM  │ 2,1 PM  │ 3,4PM │ 🟢 38%   │  │
│  │  └── AP1.1           │ 1,5 PM  │ 1,0 PM  │ 0,5PM │ 🟢 67%   │  │
│  │  └── AP2             │ 4,0 PM  │ 1,1 PM  │ 2,9PM │ 🟡 28%   │  │
│  │                                                              │  │
│  │  Kapazität Januar:   173 h verfügbar                        │  │
│  │  Bereits gebucht:    125 h (72%)                            │  │
│  │  Noch buchbar:        48 h                                  │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Navigation:** Meine Projekte | Meine Zeiterfassung | Mein Status
**KEINE:** Firmendaten, Mitarbeiter, Berichte anderer MA, andere Projekte

### 4.5 Navigations-Matrix

| Menüpunkt | client_admin | project_leader | employee |
|-----------|--------------|----------------|----------|
| Dashboard | ✅ Firmen-Dashboard | ✅ Projekt-Dashboard | ✅ Persönliches Dashboard |
| Firmendaten | ✅ | ❌ | ❌ |
| Projekte (alle) | ✅ | ❌ | ❌ |
| Meine Projekte | - | ✅ | ✅ |
| Mitarbeiter (alle) | ✅ | ❌ | ❌ |
| Team (im Projekt) | ✅ | ✅ nur eigenes | ❌ |
| Zeiterfassung (alle) | ✅ | ❌ | ❌ |
| Zeiterfassung (Team) | ✅ | ✅ | ❌ |
| Meine Zeiterfassung | ✅ | ✅ | ✅ |
| Berichte (alle) | ✅ | ❌ | ❌ |
| Berichte (Team) | ✅ | ✅ | ❌ |
| Mein Status | ✅ | ✅ | ✅ |

### 4.6 URL-Routing nach Rolle

Das System leitet nach Login automatisch zur passenden Seite:

```
LOGIN → Rolle prüfen → Weiterleitung

client_admin   → /v7/firma/dashboard         (volles Dashboard)
project_leader → /v7/firma/meine-projekte    (nur eigene Projekte)
employee       → /v7/firma/meine-projekte    (nur eigene Projekte + Zeiterfassung)
```

### 4.7 Sicherheit: Backend-Prüfung

**Wichtig:** Die Einschränkungen gelten nicht nur im UI, sondern auch im Backend!

```
Beispiel: employee versucht /v7/firma/mitarbeiter aufzurufen

1. Frontend: Menüpunkt ist nicht sichtbar
2. Middleware: Prüft Rolle → Zugriff verweigert
3. API: Liefert nur Daten, die der Rolle entsprechen
4. Datenbank: RLS-Policies als letzte Verteidigungslinie
```

---

## 5. Mitarbeiter-Seite (nur client_admin)

### 5.1 Zentrale Verwaltung

Die Mitarbeiter werden **firmenübergreifend** (nicht pro Projekt) verwaltet:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 👥 Mitarbeiter                                    [+ Neu anlegen]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ 🔍 Suche...                        Filter: [Alle ▼] [Aktiv ▼]  ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ NAME            │ POSITION      │ STUNDEN │ AUSLASTUNG │ AKT. │  │
│ ├─────────────────┼───────────────┼─────────┼────────────┼──────┤  │
│ │ Max Müller      │ Entwickler    │ 40h/Wo  │ ████████░░ │ ✏️🗑️ │  │
│ │                 │               │         │ 80%        │      │  │
│ ├─────────────────┼───────────────┼─────────┼────────────┼──────┤  │
│ │ Lisa Schmidt    │ Projektleiterin│ 30h/Wo │ ██████████ │ ✏️🗑️ │  │
│ │                 │               │         │ 100% ⚠️    │      │  │
│ ├─────────────────┼───────────────┼─────────┼────────────┼──────┤  │
│ │ Tom Weber       │ Techniker     │ 40h/Wo  │ ████░░░░░░ │ ✏️🗑️ │  │
│ │                 │               │         │ 40%        │      │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Auslastungs-Anzeige

Die Auslastung zeigt auf einen Blick:
- Wie viel Prozent der monatlichen Kapazität bereits verplant ist
- Warnung bei 100% (keine weitere Zuordnung möglich)

---

## 6. Projekt-Detailseite

### 6.1 Struktur

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Zurück zu Projekte                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 📁 Projekt: Smarte Sensortechnik                           [✏️]   │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Übersicht │ Arbeitspakete │ Team │ Zeiterfassung │ Berichte    ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ ═══════════════════════════════════════════════════════════════════│
│                                                                     │
│ [TAB: Übersicht]                                                    │
│                                                                     │
│  Förderformat:    ZIM Einzel                                        │
│  FKZ:            16KN087520                                        │
│  Laufzeit:       01.04.2025 - 31.03.2027 (24 Monate)              │
│  Fördersumme:    190.000 €                                         │
│                                                                     │
│  ┌────────────────────────────────┐                                │
│  │ Fortschritt                    │                                │
│  │ ████████████░░░░░░░░  45%      │                                │
│  │ 10 von 24 Monaten              │                                │
│  └────────────────────────────────┘                                │
│                                                                     │
│ ═══════════════════════════════════════════════════════════════════│
│                                                                     │
│ [TAB: Arbeitspakete]                                               │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ AP    │ BEZEICHNUNG              │ PM   │ TEAM    │ AKT.  │    │
│  ├───────┼──────────────────────────┼──────┼─────────┼───────┤    │
│  │ AP1   │ Konzeption               │ 3 PM │ 2 MA    │ 👤✏️🗑️│    │
│  │ AP1.1 │ └ Anforderungsanalyse    │ 1 PM │ 1 MA    │ 👤✏️🗑️│    │
│  │ AP1.2 │ └ Systemdesign           │ 2 PM │ 2 MA    │ 👤✏️🗑️│    │
│  │ AP2   │ Entwicklung              │ 8 PM │ 3 MA    │ 👤✏️🗑️│    │
│  │ AP3   │ Test & Validierung       │ 2 PM │ 1 MA    │ 👤✏️🗑️│    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                        [+ AP]      │
│                                                                     │
│ ═══════════════════════════════════════════════════════════════════│
│                                                                     │
│ [TAB: Team]                                                        │
│                                                                     │
│  Mitarbeiter diesem Projekt zuordnen:                              │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ NAME          │ ROLLE        │ VERFÜGBAR │ ZUGEORDNET │ AKT│    │
│  ├───────────────┼──────────────┼───────────┼────────────┼────┤    │
│  │ Max Müller    │ Entwickler   │ 53h frei  │ AP1, AP2   │ ✏️ │    │
│  │ Lisa Schmidt  │ Projektleit. │ 0h ⚠️     │ -          │ ✏️ │    │
│  │ Tom Weber     │ Techniker    │ 104h frei │ AP2, AP3   │ ✏️ │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                               [+ Mitarbeiter]      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Mitarbeiter-Zuordnung mit Verfügbarkeitsanzeige

Beim Zuordnen eines Mitarbeiters zu einem AP wird die Verfügbarkeit angezeigt (siehe KONZEPT-MITARBEITER-VERFUEGBARKEIT.md).

---

## 7. Gemeinsame Komponenten

### 7.1 Komponentenstruktur

```
/src/components/shared/
├── types.ts                     ← Gemeinsame TypeScript-Typen
├── constants.ts                 ← HOURS_PER_PM, BUNDESLÄNDER, etc.
├── hooks/
│   ├── useCompanyData.ts        ← Daten laden für eine Firma
│   ├── useEmployeeCapacity.ts   ← Kapazitätsberechnung
│   └── useProjectData.ts        ← Projektdaten laden
├── ui/
│   ├── PortalHeader.tsx         ← Header (blau/grün je nach Portal)
│   ├── NavigationTabs.tsx       ← Tab-Navigation
│   ├── DataTable.tsx            ← Einheitliche Tabellen
│   ├── Modal.tsx                ← Basis-Modal
│   ├── CapacityBar.tsx          ← Auslastungsbalken
│   └── Badge.tsx                ← Status-Badges
├── forms/
│   ├── ProjectForm.tsx          ← Projekt anlegen/bearbeiten
│   ├── EmployeeForm.tsx         ← Mitarbeiter anlegen/bearbeiten
│   ├── WorkPackageForm.tsx      ← AP anlegen/bearbeiten
│   └── CompanyForm.tsx          ← Firmendaten bearbeiten
├── tables/
│   ├── WorkPackageTable.tsx     ← AP-Tabelle mit Icons
│   ├── EmployeeTable.tsx        ← Mitarbeiter-Tabelle
│   └── ProjectList.tsx          ← Projektliste
└── modals/
    ├── ProjectModal.tsx         ← Modal: Projekt
    ├── EmployeeModal.tsx        ← Modal: Mitarbeiter
    ├── WorkPackageModal.tsx     ← Modal: Arbeitspaket
    ├── AssignmentModal.tsx      ← Modal: Zuordnung
    └── DeleteConfirmModal.tsx   ← Modal: Löschen bestätigen
```

### 7.2 Portal-Parameter

Alle Komponenten erhalten einen `portal`-Parameter:

```typescript
type PortalType = 'berater' | 'firma';

interface PortalConfig {
  portal: PortalType;
  primaryColor: string;      // '#0369a1' oder '#65A655'
  canEditCompany: boolean;   // Berater: ja, Firma: je nach Rolle
  canSeeAllCompanies: boolean; // Berater: ja, Firma: nein
}
```

---

## 8. Abgrenzung zum Beraterportal

### 8.1 Unterschiede

| Funktion | Beraterportal | Firmenportal |
|----------|---------------|--------------|
| Firmenauswahl | Dropdown/Liste aller Kunden | Keine (nur eigene) |
| Firmen anlegen | ✅ Ja | ❌ Nein |
| Interne Notizen | ✅ Sichtbar | ❌ Nicht sichtbar |
| Mehrere Firmen | ✅ Wechsel möglich | ❌ Nur eine |
| Import-Funktion | ✅ ZIM-PDF Import | ❌ Nicht verfügbar |

### 8.2 Gemeinsame Funktionen

Diese Funktionen sind in beiden Portalen **identisch** (nur Farbe anders):

- Projektliste und -details
- Arbeitspakete verwalten
- Mitarbeiter verwalten (Firma: nur eigene)
- Mitarbeiter zu APs zuordnen
- Zeiterfassung
- Berichte

---

## 9. Technische Umsetzung

### 9.1 Routing

```typescript
// Beraterportal
/v7/berater/foerderung                    → Firmenliste
/v7/berater/foerderung/firma/[id]         → Firmen-Detailseite
/v7/berater/foerderung/import             → ZIM-Import

// Firmenportal
/v7/firma/dashboard                        → Landingpage
/v7/firma/firmendaten                      → Stammdaten
/v7/firma/mitarbeiter                      → Mitarbeiterliste
/v7/firma/projekte                         → Projektliste
/v7/firma/projekte/[id]                    → Projekt-Detail
/v7/firma/zeiterfassung                    → Zeiterfassung
/v7/firma/berichte                         → Berichte
```

### 9.2 Authentifizierung

```typescript
// Middleware prüft:
// 1. Ist User eingeloggt?
// 2. Welche Rolle hat User?
// 3. Zu welcher Firma gehört User?
// 4. Hat User Zugriff auf diese Route?

// Firmenportal: User sieht nur Daten seiner client_company_id
// Beraterportal: Berater sieht alle ihm zugeordneten Firmen
```

---

## 10. Nächste Schritte

1. ☐ Konzept mit Martin abstimmen
2. ☐ Gemeinsame Types und Constants erstellen
3. ☐ PortalHeader-Komponente erstellen
4. ☐ Basis-Tabellen-Komponente erstellen
5. ☐ Firmenportal-Dashboard implementieren
6. ☐ Mitarbeiter-Seite (zentral) implementieren
7. ☐ Projekt-Detailseite mit Tabs implementieren
8. ☐ Kapazitätsanzeige integrieren

---

*Erstellt: 21. Januar 2026*
*Letzte Änderung: 21. Januar 2026*
