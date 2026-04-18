# PZE Modul-Architektur Konzept

**Version:** 1.0  
**Datum:** 05. Februar 2026  
**Status:** Konzeptphase  
**Autor:** Martin Ditscherlein / Claude

---

## 1. Ueberblick

Dieses Dokument mappt die bestehende PZE-Implementierung auf eine modulare Struktur
und definiert das "Modul-Dach" fuer zukuenftige Erweiterungen und Lizenzierung.

---

## 2. Modul-Uebersicht

### 2.1 Phase 1 - Pflicht-Module (Kernfunktionalitaet)

| Modul | Beschreibung | Status | Implementierung |
|-------|--------------|--------|-----------------|
| **M1: Projektmodul** | Projekte anlegen, verwalten, importieren | ✅ 90% | V7.3 |
| **M2: Arbeitszeitmodul** | Zeiterfassung, Arbeitspakete, Stundennachweise | ✅ 85% | V7.3 |
| **M3: Zahlungsanforderungsmodul** | ZA erstellen, exportieren | ⚠️ 30% | Teilweise |
| **M4: Verwendungsnachweis** | VN generieren, Dokumente | 🔲 0% | Geplant |
| **M5: AGVO/BWA-Modul** | KMU-Nachweis, Zuschlagsberechnung | 🔲 0% | Geplant |

### 2.2 Phase 2 - Zusatz-Module (Mehrwert)

| Modul | Beschreibung | Status | Implementierung |
|-------|--------------|--------|-----------------|
| **M6: FZul-Modul** | Forschungszulage Analyse & Stundennachweise | ⚠️ 40% | V7.4 geplant |
| **M7: De-minimis-Modul** | Beihilfe-Tracking, Restfoerderfaehigkeit | 🔲 0% | Geplant |
| **M8: Multiprojekt-Tool** | MA-Kapazitaet, 173h-Grenze, Ampellogik | ⚠️ 20% | Ansaetze vorhanden |
| **M9: Netzwerkmanagement** | Uebersicht fuer Netzwerk-Koordinatoren | 🔲 0% | Geplant |

---

## 3. Detailliertes Modul-Mapping

### 3.1 M1: Projektmodul ✅

**Beschreibung:** Verwaltung von Foerderprojekten inkl. ZIM/BMBF-Import

**Bereits implementiert:**
```
/components/shared/
├── ProjectDetailPage.tsx      ✅ Projekt-Detailansicht
├── ProjectList.tsx            ✅ Projektliste
├── ProjectCreateForm.tsx      ✅ Projekt anlegen (manuell + Import)
└── ProjectTeamManager.tsx     ✅ Team-Zuordnung

/app/v7/
├── berater/foerderung/        ✅ Berater: Firmenliste mit Projekten
├── firma/projekte/            ✅ Firma: Eigene Projekte
└── api/parse-zim              ✅ ZIM-PDF-Import
```

**Datenobjekte:**
- `v7_projects` - Projektdaten
- `v7_project_assignments` - MA-Projekt-Zuordnung
- `v7_work_packages` - Arbeitspakete
- `v7_work_package_assignments` - MA-AP-Zuordnung mit PM

**Was noch fehlt:**
- [ ] Projektvorlagen
- [ ] Projekt-Klonen
- [ ] Projekt-Archivierung

---

### 3.2 M2: Arbeitszeitmodul ✅

**Beschreibung:** Zeiterfassung pro MA/Monat/Arbeitspaket

**Bereits implementiert:**
```
/components/shared/
├── TimesheetForm.tsx          ✅ Monats-Zeiterfassung
├── WorkPackageTable.tsx       ✅ Arbeitsplan mit PM
├── WorkPackageEditModal.tsx   ✅ AP bearbeiten
└── WorkPackageAssignmentModal.tsx  ✅ MA zuordnen

/app/v7/
├── berater/.../zeiterfassung/ ✅ Berater: Zeiterfassung einsehen
├── firma/zeiterfassung/       ✅ Firma: Stunden erfassen
└── api/v7/arbeitsplan-import  ✅ Excel-Import fuer Arbeitsplan
```

**Datenobjekte:**
- `v7_timesheets` - Zeiteintraege
- `v7_work_packages` - Arbeitspakete mit is_technical Flag
- `v7_work_package_assignments` - PM pro MA/AP

**Features:**
- [x] Monatsansicht mit Kalender
- [x] Fehlzeiten (Urlaub, Krankheit, Schulung)
- [x] Speichern-Dialog bei ungespeicherten Aenderungen
- [x] T-Spalte fuer technische Arbeitspakete
- [x] MA-Sortierung nach Lfd. Nr. (Anlage 6.2)
- [x] Excel-Vorlage Download/Import

**Was noch fehlt:**
- [ ] Genehmigungsworkflow (MA -> PL -> GF)
- [ ] Monatsabschluss mit Sperre
- [ ] PDF-Export Stundennachweis

---

### 3.3 M3: Zahlungsanforderungsmodul ⚠️

**Beschreibung:** Zahlungsanforderungen aus Zeiterfassung generieren

**Bereits implementiert:**
```
/app/v7/
├── berater/.../berichte/      ⚠️ Grundlage: Berichte-Seite
└── firma/berichte/            ⚠️ Grundlage: Berichte-Seite
```

**Datenobjekte (noch zu erstellen):**
- `v7_payment_requests` - Zahlungsanforderungen
- `v7_payment_request_items` - Einzelpositionen

**Was noch fehlt:**
- [ ] ZA-Erstellung aus Zeitdaten
- [ ] ZA-Status-Workflow (Entwurf -> Eingereicht -> Bewilligt)
- [ ] ZA-Export (PDF, Excel)
- [ ] ZA-Historie

---

### 3.4 M4: Verwendungsnachweis 🔲

**Beschreibung:** Verwendungsnachweis zum Projektende generieren

**Noch nicht implementiert**

**Geplante Features:**
- [ ] VN aus allen ZAs des Projekts generieren
- [ ] Automatische Summenbildung
- [ ] Dokumenten-Upload (Belege)
- [ ] VN-Export (PDF nach Foerdergeber-Vorlage)

---

### 3.5 M5: AGVO/BWA-Modul 🔲

**Beschreibung:** KMU-Eigenschaft pruefen, Zuschlagsberechnung

**Noch nicht implementiert**

**Geplante Features:**
- [ ] KMU-Fragebogen
- [ ] BWA-Import oder manuelle Eingabe
- [ ] Automatische Zuschlagsberechnung (Klein: 20%, Mittel: 10%)
- [ ] Partnerunternehmen-Verflechtung

---

### 3.6 M6: FZul-Modul ⚠️

**Beschreibung:** Forschungszulage nach §35a EStG

**Bereits implementiert:**
```
/app/v7/berater/fzul/
├── page.tsx                   ✅ FZul-Uebersicht
└── analyse/page.tsx           ⚠️ Grundstruktur vorhanden

Konzept: KONZEPT-FZUL-ONLINE-EDITOR.md (detailliert)
```

**Was noch fehlt (V7.4):**
- [ ] FZul-Vorhaben anlegen
- [ ] Kapazitaetsanalyse (verfuegbare Stunden nach Abzug gefoerderter Projekte)
- [ ] FZul-Stundennachweis Online-Editor
- [ ] PDF-Generierung nach BMF-Vorlage
- [ ] Bundesland-spezifische Feiertage

---

### 3.7 M7: De-minimis-Modul 🔲

**Beschreibung:** Beihilfe-Tracking fuer EU-Konformitaet

**Noch nicht implementiert**

**Geplante Features:**
- [ ] De-minimis-Eintraege pro Firma erfassen
- [ ] Automatische Summenberechnung (3-Jahres-Zeitraum)
- [ ] Restfoerderfaehigkeit anzeigen (300.000 EUR Grenze)
- [ ] Warnungen bei Ueberschreitung

**Datenobjekte:**
- `v7_deminimis` - Beihilfe-Eintraege (Art, Datum, Betrag, Aktenzeichen)

---

### 3.8 M8: Multiprojekt-Tool ⚠️

**Beschreibung:** MA-Kapazitaetsmanagement ueber mehrere Projekte

**Ansaetze vorhanden:**
- Kapazitaets-Balken in WorkPackageTable
- PM-Berechnung (173,33 h = 1 PM)
- MA-Verfuegbarkeit Konzept (KONZEPT-MITARBEITER-VERFUEGBARKEIT-v1.md)

**Was noch fehlt:**
- [ ] Zentrale Kapazitaetsuebersicht pro MA
- [ ] 173h/Monat Grenzpruefung
- [ ] Ampellogik (Rot: Ueberbuchung, Gelb: >80%, Gruen: OK)
- [ ] Warnungen bei Doppelvergabe

---

### 3.9 M9: Netzwerkmanagement 🔲

**Beschreibung:** Fuer Koordinatoren von ZIM-Netzwerkprojekten

**Noch nicht implementiert**

**Geplante Features:**
- [ ] Netzwerk-Uebersicht (alle Mitgliedsfirmen)
- [ ] Konsolidierte Berichte
- [ ] Management-Stunden Tracking
- [ ] Netzwerk-spezifische Wording ("Management-Arbeiten" statt "foerderbare Projektarbeiten")

---

## 4. Technische Architektur

### 4.1 Aktuelle Struktur

```
src/
├── app/v7/
│   ├── berater/               # Berater-Portal (blau)
│   │   ├── foerderung/        # M1, M2, M3 (Projekte, Zeit, ZA)
│   │   └── fzul/              # M6 (FZul)
│   └── firma/                 # Firmen-Portal (gruen)
│       ├── projekte/          # M1 (Projekte)
│       ├── zeiterfassung/     # M2 (Zeit)
│       └── berichte/          # M3, M8 (Berichte, Multiprojekt)
├── components/shared/         # Wiederverwendbare Komponenten
└── types/v7-types.ts          # Zentrale Typen
```

### 4.2 Vorgeschlagene Modul-Struktur

```
src/
├── modules/                   # NEU: Modul-basierte Organisation
│   ├── core/                  # Basis-Funktionen (Auth, Layout)
│   ├── projekt/               # M1: Projektmodul
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   ├── arbeitszeit/           # M2: Arbeitszeitmodul
│   ├── zahlungsanforderung/   # M3: ZA-Modul
│   ├── verwendungsnachweis/   # M4: VN-Modul
│   ├── agvo/                  # M5: AGVO/BWA
│   ├── fzul/                  # M6: FZul
│   ├── deminimis/             # M7: De-minimis
│   ├── multiprojekt/          # M8: Kapazitaet
│   └── netzwerk/              # M9: Netzwerk
├── app/v7/                    # Pages importieren aus modules/
└── shared/                    # Wirklich geteilte Utils
```

### 4.3 Modul-Registry (fuer Lizenzierung)

```typescript
// src/config/modules.ts
export const PZE_MODULES = {
  projekt: {
    id: 'M1',
    name: 'Projektmodul',
    phase: 1,
    required: true,
    enabled: true,
  },
  arbeitszeit: {
    id: 'M2',
    name: 'Arbeitszeitmodul',
    phase: 1,
    required: true,
    enabled: true,
  },
  fzul: {
    id: 'M6',
    name: 'FZul-Modul',
    phase: 2,
    required: false,
    enabled: false, // Lizenzabhaengig
  },
  // ...
};
```

---

## 5. UI: Modul-Uebersicht im Portal

### 5.1 Berater-Dashboard (Vorschlag)

```
┌────────────────────────────────────────────────────────────────┐
│  PZE Berater-Portal                     Martin Ditscherlein   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Willkommen, Martin!                                           │
│                                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │ 📁 Projekte     │  │ ⏱️ Zeiterfassung │  │ 💰 Zahlungen   ││
│  │                 │  │                 │  │                 ││
│  │ 3 Firmen        │  │ Februar 2026    │  │ 2 offen        ││
│  │ 5 Projekte      │  │ 85% erfasst     │  │ 1 eingereicht  ││
│  │                 │  │                 │  │                 ││
│  │ [Oeffnen >]     │  │ [Oeffnen >]     │  │ [Oeffnen >]    ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
│                                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │ 🔬 FZul-Analyse │  │ 📊 De-minimis   │  │ 👥 Kapazitaet  ││
│  │                 │  │                 │  │                 ││
│  │ 3 Vorhaben      │  │ 2 Firmen        │  │ 15 Mitarbeiter ││
│  │ 2026 aktiv      │  │ geprueft        │  │ 3 Warnungen    ││
│  │                 │  │                 │  │                 ││
│  │ [Oeffnen >]     │  │ [Oeffnen >]     │  │ [Oeffnen >]    ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 6. Migrations-Strategie

### 6.1 Phase A: Konzept bestaetigen (diese Woche)
- [x] Modul-Mapping erstellen (dieses Dokument)
- [ ] Review mit Martin
- [ ] Priorisierung festlegen

### 6.2 Phase B: Code-Restrukturierung (optional)
- [ ] Entscheidung: Sofort refactoren oder spaeter?
- [ ] Falls ja: Module-Ordner erstellen, Code verschieben

### 6.3 Phase C: Modul-UI (nach V7.3 Bugfix)
- [ ] Dashboard mit Modul-Kacheln
- [ ] Modul-basierte Navigation

### 6.4 Phase D: Fehlende Module implementieren
- [ ] M3: Zahlungsanforderung vervollstaendigen
- [ ] M6: FZul (V7.4)
- [ ] M7: De-minimis
- [ ] M4, M5: VN, AGVO

---

## 7. Lizenzmodell (Zukunft)

### 7.1 Paket-Vorschlag

| Paket | Module | Zielgruppe | Preis/Monat |
|-------|--------|------------|-------------|
| **Basis** | M1, M2 | Kleine Firmen | 29 EUR |
| **Standard** | M1-M5 | KMU mit Foerderung | 79 EUR |
| **Professional** | M1-M8 | Berater | 149 EUR |
| **Enterprise** | Alle + Support | Grosse Berater | Individuell |

### 7.2 Einzelmodul-Preise (Add-on)

| Modul | Add-on Preis |
|-------|--------------|
| M6: FZul | +29 EUR |
| M7: De-minimis | +19 EUR |
| M8: Multiprojekt | +29 EUR |
| M9: Netzwerk | +49 EUR |

---

## 8. Naechste Schritte

1. **Morgen:** Vercel-Bug fixen (filter undefined)
2. **Diese Woche:** Modul-Konzept reviewen und finalisieren
3. **Naechste Woche:** Entscheidung Code-Restrukturierung
4. **Februar:** V7.4 (FZul-Modul) starten

---

## Anhang: Datenobjekt-Uebersicht

| Tabelle | Modul | Status |
|---------|-------|--------|
| v7_client_companies | Core | ✅ |
| v7_employees | Core | ✅ |
| v7_projects | M1 | ✅ |
| v7_project_assignments | M1 | ✅ |
| v7_work_packages | M1, M2 | ✅ |
| v7_work_package_assignments | M1, M2 | ✅ |
| v7_timesheets | M2 | ✅ |
| v7_payment_requests | M3 | 🔲 |
| v7_usage_reports | M4 | 🔲 |
| v7_agvo_assessments | M5 | 🔲 |
| v7_fzul_projects | M6 | 🔲 |
| v7_fzul_timesheets | M6 | 🔲 |
| v7_deminimis | M7 | 🔲 |
