# KONZEPT: Firmen-Detailseite Bearbeitung

**Version:** v7.3.33  
**Datum:** 19. Januar 2026  
**Autor:** Martin Ditscherlein / Claude AI  
**Status:** Geplant

---

## 1. Ausgangssituation

### 1.1 Aktueller Zustand

Die Firmen-Detailseite (`/v7/berater/foerderung/firma/[id]`) zeigt aktuell die Firmendaten nur **lesend** an:

- Firmenname
- Kurzname
- Adresse (Straße, PLZ, Ort)
- Bundesland
- Ansprechpartner
- E-Mail
- Telefon
- Angelegt am

**Problem:** Es gibt **keine Möglichkeit**, diese Daten auf der Firmen-Detailseite zu bearbeiten. Der Berater müsste zurück zur Übersicht gehen und dort über das Edit-Icon im Firmenkarten-Modal bearbeiten - ein inkonsistenter und nicht intuitiver Workflow.

### 1.2 Konzeptionelle Kritik

> "Der natürliche Workflow ist: Firma anklicken → Firmenseite öffnen → dort alle Daten bearbeiten. Bearbeiten in der Übersicht macht keinen Sinn."

Die aktuelle Implementierung widerspricht dem **Nokia 2110 / Apple Design-Prinzip**: Der User erwartet, dass er auf der Detailseite einer Firma auch alle Firmendaten bearbeiten kann.

---

## 2. Anforderungen

### 2.1 Funktionale Anforderungen

#### F1: Firmendaten bearbeiten auf Detailseite
- Der Berater kann alle Firmenstammdaten direkt auf der Firmen-Detailseite bearbeiten
- Bearbeitung erfolgt über Modal-Dialog (konsistent mit Projekt-/Mitarbeiter-Bearbeitung)
- Stift-Icon im Firmendaten-Bereich öffnet das Modal

#### F2: Bearbeitbare Felder
Folgende Felder müssen bearbeitbar sein:

**Stammdaten:**
- Firmenname (Pflichtfeld)
- Kurzname
- Straße
- PLZ
- Ort
- Bundesland (Dropdown)
- Ansprechpartner
- E-Mail
- Telefon

**Förderrelevante Daten (NEU - für Antragsstellung):**
- KMU-Status (Dropdown: Kleinstunternehmen, Kleines Unternehmen, Mittleres Unternehmen, Großunternehmen)
- Gründungsjahr
- Branche / Wirtschaftszweig
- Mitarbeiterzahl (zum Stichtag)
- Jahresumsatz (€)
- Bilanzsumme (€)
- Handelsregister-Nummer
- USt-IdNr.

**Interne Notizen:**
- internal_notes (Textarea)

#### F3: Validierung
- Firmenname ist Pflichtfeld
- E-Mail-Format-Validierung
- PLZ: nur 5 Ziffern
- Gründungsjahr: 4 Ziffern, nicht in der Zukunft

### 2.2 Design-Anforderungen

#### D1: Konsistenz
- Modal-Design identisch zu Projekt-Bearbeitung und Mitarbeiter-Bearbeitung
- Stift-Icon rechts neben "Firmendaten" Überschrift (wie bei anderen Bereichen)

#### D2: Struktur im Modal
Das Modal sollte die Felder logisch gruppieren:

```
┌─────────────────────────────────────────────────────┐
│  Firma bearbeiten                              [X]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  STAMMDATEN                                         │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ Firmenname*     │  │ Kurzname        │          │
│  └─────────────────┘  └─────────────────┘          │
│                                                     │
│  ADRESSE                                            │
│  ┌─────────────────────────────────────┐           │
│  │ Straße                              │           │
│  └─────────────────────────────────────┘           │
│  ┌─────────┐  ┌───────────────────────┐            │
│  │ PLZ     │  │ Ort                   │            │
│  └─────────┘  └───────────────────────┘            │
│  ┌─────────────────────────────────────┐           │
│  │ Bundesland                      [v] │           │
│  └─────────────────────────────────────┘           │
│                                                     │
│  ANSPRECHPARTNER                                    │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ Name            │  │ E-Mail          │          │
│  └─────────────────┘  └─────────────────┘          │
│  ┌─────────────────────────────────────┐           │
│  │ Telefon                             │           │
│  └─────────────────────────────────────┘           │
│                                                     │
│  FÖRDERRELEVANTE ANGABEN                            │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ KMU-Status  [v] │  │ Gründungsjahr   │          │
│  └─────────────────┘  └─────────────────┘          │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ Mitarbeiterzahl │  │ Jahresumsatz    │          │
│  └─────────────────┘  └─────────────────┘          │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ Bilanzsumme     │  │ Branche         │          │
│  └─────────────────┘  └─────────────────┘          │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ HR-Nummer       │  │ USt-IdNr.       │          │
│  └─────────────────┘  └─────────────────┘          │
│                                                     │
│  INTERNE NOTIZEN                                    │
│  ┌─────────────────────────────────────┐           │
│  │                                     │           │
│  │                                     │           │
│  └─────────────────────────────────────┘           │
│                                                     │
│           [Abbrechen]    [Speichern]               │
└─────────────────────────────────────────────────────┘
```

---

## 3. Datenbank-Erweiterungen

### 3.1 Neue Felder in `client_companies`

Die folgenden Felder müssen zur Tabelle `client_companies` hinzugefügt werden:

```sql
-- Migration: v7.3.33 - Förderrelevante Firmendaten
ALTER TABLE client_companies ADD COLUMN IF NOT EXISTS kmu_status VARCHAR(50);
ALTER TABLE client_companies ADD COLUMN IF NOT EXISTS founding_year INTEGER;
ALTER TABLE client_companies ADD COLUMN IF NOT EXISTS industry_sector VARCHAR(255);
ALTER TABLE client_companies ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE client_companies ADD COLUMN IF NOT EXISTS annual_revenue DECIMAL(15,2);
ALTER TABLE client_companies ADD COLUMN IF NOT EXISTS balance_sheet_total DECIMAL(15,2);
ALTER TABLE client_companies ADD COLUMN IF NOT EXISTS commercial_register VARCHAR(100);
ALTER TABLE client_companies ADD COLUMN IF NOT EXISTS vat_id VARCHAR(50);

-- Kommentare für Dokumentation
COMMENT ON COLUMN client_companies.kmu_status IS 'KMU-Einstufung: micro, small, medium, large';
COMMENT ON COLUMN client_companies.founding_year IS 'Gründungsjahr des Unternehmens';
COMMENT ON COLUMN client_companies.industry_sector IS 'Branche/Wirtschaftszweig';
COMMENT ON COLUMN client_companies.employee_count IS 'Anzahl Mitarbeiter (zum Stichtag)';
COMMENT ON COLUMN client_companies.annual_revenue IS 'Jahresumsatz in EUR';
COMMENT ON COLUMN client_companies.balance_sheet_total IS 'Bilanzsumme in EUR';
COMMENT ON COLUMN client_companies.commercial_register IS 'Handelsregisternummer';
COMMENT ON COLUMN client_companies.vat_id IS 'Umsatzsteuer-Identifikationsnummer';
```

### 3.2 KMU-Status Werte

| Wert | Bezeichnung | Definition (EU) |
|------|-------------|-----------------|
| `micro` | Kleinstunternehmen | < 10 MA, ≤ 2 Mio € Umsatz oder Bilanzsumme |
| `small` | Kleines Unternehmen | < 50 MA, ≤ 10 Mio € Umsatz oder Bilanzsumme |
| `medium` | Mittleres Unternehmen | < 250 MA, ≤ 50 Mio € Umsatz, ≤ 43 Mio € Bilanzsumme |
| `large` | Großunternehmen | ≥ 250 MA oder überschreitet KMU-Schwellen |

---

## 4. UI-Änderungen

### 4.1 Berater-Portal: Kundenfirmen-Übersicht

**Änderung:** Statistik-Zeile entfernen (wie im Firmen-Portal bereits geschehen)

**Begründung:** Die Kennzahlen (Aktive Firmen, Eingeladen, Projekte gesamt, Mitarbeiter gesamt) haben in der Übersicht geringe Aussagekraft und gehören in einen separaten Berichte-Bereich.

### 4.2 Firmen-Detailseite: Statistik-Zeile

**Behalten:** Die Statistik-Karten auf der Firmen-Detailseite (Förderprojekte, Mitarbeiter, Arbeitspakete, Fördervolumen) haben hier Sinn, da sie den Kontext dieser spezifischen Firma zeigen.

### 4.3 Firmendaten-Bereich erweitern

Der Abschnitt "Firmendaten" auf der Übersicht-Tab muss:
1. Einen Bearbeiten-Button (Stift-Icon) erhalten
2. Die neuen förderrelevanten Felder anzeigen (wenn gepflegt)

---

## 5. Implementierungsplan

### Phase 1: Konzept & Pflichtenheft (diese Session)
- [x] Konzeptdokument erstellen
- [ ] Pflichtenheft aktualisieren (v4.12)

### Phase 2: Datenbank-Migration
- [ ] SQL-Migration erstellen
- [ ] In Supabase ausführen
- [ ] TypeScript-Interface aktualisieren

### Phase 3: UI-Implementierung
- [ ] Firmendaten-Bearbeitung Modal erstellen
- [ ] Stift-Icon im Firmendaten-Bereich
- [ ] Neue Felder in der Anzeige

### Phase 4: Bereinigung
- [ ] Statistik-Zeile aus Berater-Portal Kundenfirmen entfernen

---

## 6. Abnahmekriterien

- [ ] Berater kann auf Firmen-Detailseite alle Firmendaten bearbeiten
- [ ] Modal öffnet sich mit allen aktuellen Werten vorausgefüllt
- [ ] Speichern aktualisiert die Daten und zeigt sie sofort an
- [ ] Validierung funktioniert (Pflichtfelder, Formate)
- [ ] Neue förderrelevante Felder sind sichtbar und bearbeitbar
- [ ] Statistik-Zeile ist aus Berater-Portal Kundenfirmen entfernt

---

**Erstellt:** 19. Januar 2026  
**Nächster Schritt:** Pflichtenheft-Update v4.12
