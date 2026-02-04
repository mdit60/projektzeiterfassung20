# KONZEPT: Berichte-Modul Firmen-Portal

**Version:** 1.0  
**Datum:** 05. Februar 2026  
**Status:** ENTWURF  
**Zielgruppe:** Firmen-Portal (grün) - Firmenadministratoren und Projektleiter

---

## 1. Übersicht & Zielsetzung

### 1.1 Zweck des Berichte-Moduls

Das Berichte-Modul soll dem Firmenmanager ermöglichen:
- **Controlling:** Projektfortschritt und Kostenentwicklung überwachen
- **Qualitätssicherung:** Vollständigkeit der Zeiterfassung prüfen
- **Abrechnung:** Zahlungsanforderungen für Fördergeber vorbereiten
- **Dokumentation:** Nachweise für Prüfungen generieren

### 1.2 Designprinzip

> Wenige, aber aussagekräftige Informationen auf einen Blick.
> Drill-Down zu Details bei Bedarf.

---

## 2. Seitenstruktur

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Header (grün): AS System · Firmen-Portal         Thomas Dührkop  [▼]  │
├─────────────────────────────────────────────────────────────────────────┤
│  Navigation: Firmendaten | Projekte | Mitarbeiter | Zeiterfassung | [Berichte] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  BERICHTE & CONTROLLING                                          │   │
│  │  Übersicht über Projekte, Kosten und Zeiterfassung              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Förderprojekte│ │ Mitarbeiter  │ │ Geplante PM  │ │ Erfasste PM  │   │
│  │      1        │ │      4       │ │    64.0      │ │    12.5      │   │
│  │  aktiv       │ │  im Projekt  │ │   gesamt     │ │   (19.5%)    │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                                         │
│  ══════════════════════════════════════════════════════════════════    │
│                                                                         │
│  PROJEKT-ÜBERSICHT                              [Zeitraum: ▼ Gesamt]   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Projekt        │ Laufzeit      │ Plan-PM │ Ist-PM │ Status      │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ DigiTrans      │ 05/26 - 04/28 │  64.0   │  12.5  │ ████░░ 19%  │   │
│  │ ZIM 16KN087502 │               │         │        │ ✓ Im Plan   │   │
│  │                │               │         │        │ [Details]   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ══════════════════════════════════════════════════════════════════    │
│                                                                         │
│  ZEITERFASSUNGS-STATUS                          [Monat: ▼ Feb 2026]    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Mitarbeiter       │ Projekt    │ Soll-Tage │ Erfasst │ Status   │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ Thomas Dührkop    │ DigiTrans  │    20     │   18    │ ⚠️ 2 offen│   │
│  │ Martin Dührkop    │ DigiTrans  │    20     │   20    │ ✅ Vollst.│   │
│  │ Lisa Schmidt      │ DigiTrans  │    20     │    0    │ ❌ Fehlt  │   │
│  │ Max Müller        │ DigiTrans  │    20     │   15    │ ⚠️ 5 offen│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ══════════════════════════════════════════════════════════════════    │
│                                                                         │
│  REPORTS ERSTELLEN                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  [📊 Personalkosten-Report]    [📋 Stundennachweis]             │   │
│  │   Kosten pro MA/AP/Projekt      Detaillierte Zeiterfassung      │   │
│  │   Excel-Export                  PDF für Verwendungsnachweis     │   │
│  │                                                                  │   │
│  │  [📈 Projekt-Fortschritt]      [💰 Zahlungsanforderung]         │   │
│  │   Plan vs. Ist Vergleich        Mittelabruf vorbereiten         │   │
│  │   Grafische Auswertung          Quartalsweise Abrechnung        │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Komponenten im Detail

### 3.1 Kennzahlen-Leiste (oben)

| Kennzahl | Beschreibung | Berechnung |
|----------|--------------|------------|
| **Förderprojekte** | Anzahl aktiver Projekte | `COUNT(v7_projects WHERE is_active)` |
| **Mitarbeiter** | MA mit Projektzuordnung | `COUNT(DISTINCT employee_id FROM v7_project_assignments)` |
| **Geplante PM** | Summe aller geplanten PM | `SUM(total_person_months FROM v7_work_packages)` |
| **Erfasste PM** | Summe aller erfassten PM | `SUM(hours) / 173.33 FROM v7_timesheets` |

**Fortschritts-Prozent:** `Erfasste PM / Geplante PM × 100`

---

### 3.2 Projekt-Übersicht

Zeigt alle Projekte der Firma mit:

| Spalte | Inhalt |
|--------|--------|
| Projekt | Name + Förderprogramm-Badge (ZIM, BMBF) |
| FKZ | Förderkennzeichen |
| Laufzeit | Start - Ende |
| Plan-PM | Geplante Personenmonate gesamt |
| Ist-PM | Erfasste Personenmonate |
| Status | Fortschrittsbalken + Ampel |

**Ampel-Logik:**
- 🟢 Grün: Ist ≤ Plan (zeitanteilig)
- 🟡 Gelb: Ist 100-110% von Plan
- 🔴 Rot: Ist > 110% von Plan

**Zeitraum-Filter:** Gesamt | Aktuelles Jahr | Aktuelles Quartal | Benutzerdefiniert

**[Details]-Button:** Öffnet Projekt-Detailseite

---

### 3.3 Zeiterfassungs-Status

Zeigt für den gewählten Monat:

| Spalte | Inhalt |
|--------|--------|
| Mitarbeiter | Name |
| Projekt(e) | Zugeordnete Projekte |
| Soll-Tage | Arbeitstage im Monat (ohne Wochenenden/Feiertage) |
| Erfasst | Tage mit Zeiterfassung oder Fehlzeit |
| Status | ✅ Vollständig / ⚠️ X offen / ❌ Fehlt komplett |

**Monat-Filter:** Dropdown zur Monatsauswahl

**Klick auf MA:** Öffnet Zeiterfassung für diesen MA/Monat

---

### 3.4 Reports erstellen

Vier Report-Kacheln mit Beschreibung:

#### 📊 Personalkosten-Report
- **Zweck:** Kostenübersicht pro MA, AP, Projekt
- **Inhalt:** Stunden × Stundensatz = Kosten
- **Zeitraum:** Wählbar (Monat, Quartal, Jahr, Gesamt)
- **Export:** Excel (.xlsx)

#### 📋 Stundennachweis
- **Zweck:** Detaillierte Zeiterfassung für Verwendungsnachweis
- **Inhalt:** Tagesgenaue Auflistung pro MA/AP
- **Zeitraum:** Wählbar
- **Export:** PDF (druckfertig)

#### 📈 Projekt-Fortschritt
- **Zweck:** Plan vs. Ist Visualisierung
- **Inhalt:** Balkendiagramm pro AP, Trendanalyse
- **Zeitraum:** Projektlaufzeit
- **Export:** PDF mit Grafiken

#### 💰 Zahlungsanforderung (Mittelabruf)
- **Zweck:** Quartalsweise Abrechnung vorbereiten
- **Inhalt:** Personalkosten nach Förderrichtlinien
- **Zeitraum:** Quartal (3 Monate)
- **Export:** Excel (zur Weiterverarbeitung)

---

## 4. Datenquellen

### 4.1 Benötigte Daten

```sql
-- Projekte der Firma
SELECT * FROM v7_projects WHERE company_id = :companyId AND is_active = true;

-- Mitarbeiter mit Projektzuordnung
SELECT DISTINCT e.*, pa.project_id, pa.employee_number, pa.hourly_rate_override
FROM v7_employees e
JOIN v7_project_assignments pa ON e.id = pa.employee_id
WHERE e.company_id = :companyId;

-- Arbeitspakete mit Planung
SELECT wp.*, 
       SUM(wpa.planned_person_months) as planned_pm
FROM v7_work_packages wp
LEFT JOIN v7_work_package_assignments wpa ON wp.id = wpa.work_package_id
WHERE wp.project_id IN (SELECT id FROM v7_projects WHERE company_id = :companyId)
GROUP BY wp.id;

-- Zeiterfassung
SELECT ts.*, e.display_name, wp.ap_code, wp.name as ap_name
FROM v7_timesheets ts
JOIN v7_employees e ON ts.employee_id = e.id
LEFT JOIN v7_work_packages wp ON ts.work_package_id = wp.id
WHERE ts.project_id IN (SELECT id FROM v7_projects WHERE company_id = :companyId);
```

### 4.2 Berechnungen

```typescript
// Personenmonate aus Stunden
const HOURS_PER_PM = 173.33;
const pmFromHours = (hours: number) => hours / HOURS_PER_PM;

// Arbeitstage im Monat (ohne Wochenenden)
const getWorkingDays = (year: number, month: number) => {
  // Berücksichtigt nur Mo-Fr, keine Feiertage
  // Für Feiertage: separate Feiertagstabelle oder API
};

// Erfassungs-Status
const getStatus = (erfasst: number, soll: number) => {
  if (erfasst >= soll) return 'vollständig';
  if (erfasst > 0) return 'unvollständig';
  return 'fehlt';
};
```

---

## 5. Export-Formate

### 5.1 Excel-Export (Personalkosten)

```
Blatt 1: Zusammenfassung
- Projekt, Zeitraum, Gesamtkosten

Blatt 2: Nach Mitarbeiter
- MA | Stundensatz | Stunden | Kosten

Blatt 3: Nach Arbeitspaket
- AP | MA | Stunden | Kosten

Blatt 4: Rohdaten
- Datum | MA | AP | Stunden | Stundensatz | Kosten
```

### 5.2 PDF-Export (Stundennachweis)

```
┌─────────────────────────────────────────────────────────────────┐
│  STUNDENNACHWEIS                                                │
│  Projekt: DigiTrans (16KN087502)                                │
│  Zeitraum: 01.01.2026 - 31.03.2026 (Q1/2026)                   │
│  Firma: AS System GmbH                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Mitarbeiter: Thomas Dührkop (Lfd. Nr. 1)                      │
│  ───────────────────────────────────────────────────────────── │
│  Datum      │ AP      │ Tätigkeit              │ Stunden       │
│  02.01.2026 │ AP1     │ Konzeption             │ 8,0           │
│  03.01.2026 │ AP1     │ Konzeption             │ 6,5           │
│  03.01.2026 │ AP2     │ Entwicklung            │ 1,5           │
│  ...        │ ...     │ ...                    │ ...           │
│  ───────────────────────────────────────────────────────────── │
│  Summe Thomas Dührkop:                          │ 245,5 h      │
│                                                                 │
│  Mitarbeiter: Martin Dührkop (Lfd. Nr. 2)                      │
│  ...                                                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  GESAMTSUMME Q1/2026:  523,0 Stunden = 3,02 PM                 │
│  Erstellt am: 05.02.2026                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Implementierungs-Reihenfolge

### Phase 1: Basis (v7.3.88)
1. ✅ Kennzahlen-Leiste mit echten Daten
2. ✅ Projekt-Übersicht Tabelle
3. ✅ Zeiterfassungs-Status Tabelle

### Phase 2: Reports (v7.3.89)
4. 📊 Personalkosten-Report (Excel)
5. 📋 Stundennachweis (PDF)

### Phase 3: Erweitert (v7.3.90)
6. 📈 Projekt-Fortschritt (Grafiken)
7. 💰 Zahlungsanforderung (förderformatspezifisch)

---

## 7. Technische Umsetzung

### 7.1 Komponenten-Struktur

```
src/
├── app/v7/firma/berichte/
│   └── page.tsx              # Hauptseite
├── components/shared/
│   ├── ReportsDashboard.tsx  # Dashboard-Komponente
│   ├── ProjectStatusTable.tsx
│   ├── TimesheetStatusTable.tsx
│   └── ReportGenerator.tsx   # Export-Logik
└── app/api/v7/reports/
    ├── personalkosten/route.ts
    ├── stundennachweis/route.ts
    └── projekt-fortschritt/route.ts
```

### 7.2 Bibliotheken

| Zweck | Bibliothek |
|-------|------------|
| Excel-Export | exceljs (bereits vorhanden) |
| PDF-Export | @react-pdf/renderer oder pdfmake |
| Diagramme | recharts oder chart.js |

---

## 8. Offene Fragen

1. **Feiertage:** Sollen bundeslandspezifische Feiertage berücksichtigt werden?
2. **Tätigkeitsbeschreibung:** Soll es ein Freitextfeld pro Zeiteintrag geben?
3. **Unterschrift:** Braucht der Stundennachweis eine Unterschriftszeile?
4. **Zahlungsanforderung:** ZIM-spezifisches Format oder generisch?

---

## 9. Berater-Portal

**Hinweis:** Im Berater-Portal fehlt der "Berichte"-Tab aktuell. 

**Empfehlung:** Für Berater sollte es projektübergreifende Auswertungen geben:
- Alle Projekte aller Kunden
- Fällige Zahlungsanforderungen
- Auslaufende Projekte
- etc.

→ Separates Konzept für Berater-Berichte erstellen.

---

**Ende des Konzepts v1.0**
