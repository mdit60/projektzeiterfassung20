# KONZEPT: Mitarbeiter-Verfügbarkeit und Stunden-Management

**Version:** 1.0  
**Datum:** 21. Januar 2026  
**Projekt:** PZE - Projektzeiterfassung für FuE-Fördervorhaben  
**Status:** Entwurf zur Abstimmung

---

## 1. Zielsetzung

Dieses Konzept beschreibt die zentrale Logik für die Verwaltung von Mitarbeiter-Arbeitszeiten über mehrere Förderprojekte hinweg. Es stellt sicher, dass:

1. **Keine Überbuchung** von Mitarbeitern erfolgt
2. **Keine Doppelförderung** bei FZul-Anträgen entsteht
3. **Transparenz** über die Auslastung aller Mitarbeiter besteht

---

## 2. Grundprinzipien

### 2.1 Zentrale Mitarbeiterverwaltung

Mitarbeiter werden **einmalig auf Firmenebene** angelegt und gepflegt:

```
Firma (z.B. Tippl GmbH)
├── Mitarbeiter (zentral verwaltet)
│   ├── Max Müller      - 40h/Woche
│   ├── Lisa Schmidt    - 30h/Woche
│   └── Tom Weber       - 40h/Woche
│
└── Projekte
    ├── Projekt Alpha (ZIM)     → Mitarbeiter werden zugeordnet
    ├── Projekt Beta (BMBF)     → Mitarbeiter werden zugeordnet
    └── FZul-Vorhaben 2025      → Nur freie Stunden verwendbar!
```

**Vorteile:**
- Keine redundante Datenpflege
- Einheitliche Stammdaten (Qualifikation, Stundensatz, etc.)
- Firmenweite Auslastungsübersicht

### 2.2 Stunden-Budget pro Mitarbeiter

Jeder Mitarbeiter hat ein **monatliches Stunden-Budget** basierend auf seiner vertraglichen Arbeitszeit:

| Wochenstunden | Monatsstunden (Durchschnitt) | Berechnung |
|---------------|------------------------------|------------|
| 40 h/Woche    | 173,33 h/Monat              | 40 × 52 ÷ 12 |
| 35 h/Woche    | 151,67 h/Monat              | 35 × 52 ÷ 12 |
| 30 h/Woche    | 130,00 h/Monat              | 30 × 52 ÷ 12 |
| 20 h/Woche    | 86,67 h/Monat               | 20 × 52 ÷ 12 |

**Formel:** `Monatsstunden = Wochenstunden × 52 ÷ 12`

### 2.3 Stunden-Kategorien

Die Arbeitszeit eines Mitarbeiters gliedert sich in:

```
┌─────────────────────────────────────────────────────────────┐
│              GESAMT-ARBEITSZEIT (z.B. 173 h/Monat)          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     GEFÖRDERTE PROJEKTARBEIT                        │   │
│  │     (ZIM, BMBF, Landesprogramme)                    │   │
│  │                                                     │   │
│  │  - Projekt Alpha (ZIM):     80 h                    │   │
│  │  - Projekt Beta (BMBF):     40 h                    │   │
│  │  ─────────────────────────────                      │   │
│  │  = Summe gefördert:        120 h                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     FREIE ARBEITSZEIT                               │   │
│  │     (Nicht-geförderte Tätigkeiten)                  │   │
│  │                                                     │   │
│  │  = 173 h - 120 h = 53 h                             │   │
│  │                                                     │   │
│  │  → Verwendbar für:                                  │   │
│  │    - Normale Firmenarbeit                           │   │
│  │    - FZul-fähige FuE-Tätigkeiten (§35a EStG)       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Förderarten und ihre Regeln

### 3.1 Übersicht Förderarten

| Förderart | Typ | Stunden-Quelle | Doppelförderung |
|-----------|-----|----------------|-----------------|
| ZIM (Einzel, Koop, Netzwerk) | Zuschuss | Dedizierte Projektzeit | Nicht erlaubt |
| BMBF KMU-innovativ | Zuschuss | Dedizierte Projektzeit | Nicht erlaubt |
| Forschungszulage (FZul) | Steuergutschrift | **Nur freie Zeit!** | Nicht erlaubt |
| Landesprogramme | Zuschuss | Dedizierte Projektzeit | Nicht erlaubt |

### 3.2 Wichtige Regel: Keine Doppelförderung

**§35a EStG (Forschungszulage) schließt explizit aus:**

> Aufwendungen, die bereits durch andere öffentliche Fördermittel (Zuschüsse, Zulagen) 
> gefördert werden, dürfen NICHT in die FZul-Bemessungsgrundlage einfließen.

**Praktische Konsequenz:**
- Stunden, die für ZIM/BMBF-Projekte erfasst wurden → **NICHT FZul-fähig**
- Nur die verbleibende freie Arbeitszeit → **FZul-fähig**

### 3.3 Beispiel: Max Müller im Januar 2026

```
Max Müller (40h/Woche = 173 h/Monat)
════════════════════════════════════════════════════════════

Projekt Alpha (ZIM Einzel)
  └── AP1 Konzeption:        30 h erfasst
  └── AP2 Entwicklung:       50 h erfasst
  ───────────────────────────────
  Summe ZIM:                 80 h  ← Gefördert, nicht FZul-fähig

Projekt Beta (BMBF KMU-innovativ)  
  └── AP3 Prototyp:          40 h erfasst
  ───────────────────────────────
  Summe BMBF:                40 h  ← Gefördert, nicht FZul-fähig

════════════════════════════════════════════════════════════
AUSWERTUNG Januar 2026:

  Gesamt verfügbar:         173 h
  - ZIM gefördert:          -80 h
  - BMBF gefördert:         -40 h
  ───────────────────────────────
  = FREI für FZul:           53 h  ← Nur diese sind FZul-fähig!
  
════════════════════════════════════════════════════════════
```

---

## 4. Systemverhalten

### 4.1 Bei Mitarbeiter-Zuordnung zu Projekt/AP

Wenn ein Mitarbeiter einem Arbeitspaket zugeordnet wird, zeigt das System:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Mitarbeiter zu AP2.1 "Prototypentwicklung" zuordnen                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Mitarbeiter        │ Kapazität  │ Bereits verplant      │ Zuordnen │
│ ───────────────────┼────────────┼───────────────────────┼───────── │
│ Max Müller         │ 173 h/Mon  │ ⚫ Projekt A: 80h     │          │
│ (Entwickler, 40h)  │            │ ⚫ Projekt B: 40h     │ [__] PM  │
│                    │            │ ════════════════      │          │
│                    │            │ Frei: 53h (31%)       │          │
│ ───────────────────┼────────────┼───────────────────────┼───────── │
│ Lisa Schmidt       │ 130 h/Mon  │ ⚫ Projekt A: 130h    │          │
│ (PM, 30h)          │            │ ════════════════      │ ⚠️ VOLL  │
│                    │            │ Frei: 0h (0%)         │          │
│ ───────────────────┼────────────┼───────────────────────┼───────── │
│ Tom Weber          │ 173 h/Mon  │ (keine Zuordnung)     │          │
│ (Techniker, 40h)   │            │ ════════════════      │ [__] PM  │
│                    │            │ Frei: 173h (100%)     │          │
└─────────────────────────────────────────────────────────────────────┘
```

**Visuelle Indikatoren:**
- 🟢 Grün: > 50% verfügbar
- 🟡 Gelb: 20-50% verfügbar  
- 🔴 Rot: < 20% verfügbar
- ⚠️ Warnung: Vollständig ausgelastet

### 4.2 Bei Zeiterfassung

Wenn ein Mitarbeiter Stunden erfasst, prüft das System:

**Szenario A: Normale Erfassung (unter Budget)**
```
Max Müller erfasst für Januar 2026:
  Projekt Alpha, AP1: 30 h
  
  ✅ Erfassung gespeichert
  ℹ️ Verbleibend im Januar: 143 h
```

**Szenario B: Warnung bei Annäherung ans Limit**
```
Max Müller erfasst für Januar 2026:
  Projekt Alpha, AP1: 30 h
  Projekt Alpha, AP2: 50 h
  Projekt Beta, AP3: 40 h
  Projekt Gamma, AP1: 50 h  ← NEU
  
  ⚠️ WARNUNG: Diese Erfassung würde 170 h erreichen.
     Verbleibend: nur noch 3 h im Januar.
     
  [Trotzdem speichern] [Abbrechen]
```

**Szenario C: Blockierung bei Überschreitung**
```
Max Müller erfasst für Januar 2026:
  (bereits erfasst: 170 h)
  Projekt Gamma, AP2: 20 h  ← NEU
  
  ❌ FEHLER: Überschreitung um 17 h!
     Max Müller hat nur 173 h/Monat verfügbar.
     Bereits erfasst: 170 h
     Diese Erfassung: 20 h
     
  [Korrigieren]
```

### 4.3 Bei FZul-Zeiterfassung

Spezielle Prüfung für Forschungszulage:

```
Max Müller erfasst FZul-Stunden für Januar 2026:
  FZul-Vorhaben "KI-Optimierung": 60 h  ← NEU
  
  ❌ FEHLER: Nur 53 h für FZul verfügbar!
  
  Berechnung:
    Gesamt verfügbar:     173 h
    - ZIM Projekt Alpha:  -80 h (gefördert)
    - BMBF Projekt Beta:  -40 h (gefördert)
    ─────────────────────────────
    = FZul-fähig:          53 h
    
  Ihre Eingabe: 60 h → Überschreitung um 7 h
  
  💡 Tipp: Reduzieren Sie die FZul-Stunden auf max. 53 h
           oder prüfen Sie die anderen Projekterfassungen.
           
  [Korrigieren]
```

---

## 5. Datenmodell-Erweiterungen

### 5.1 Bestehende Tabellen (relevant)

```sql
-- Mitarbeiter mit Wochenstunden
v7_employees
  - id
  - client_company_id
  - display_name
  - weekly_hours          ← Basis für Monatsbudget
  - ...

-- Zeiterfassungen
v7_timesheets
  - id
  - employee_id
  - work_package_id
  - date
  - hours
  - ...
```

### 5.2 Neue/Erweiterte Views (Vorschlag)

```sql
-- View: Monatliche Auslastung pro Mitarbeiter
CREATE VIEW v7_employee_monthly_capacity AS
SELECT 
  e.id AS employee_id,
  e.display_name,
  e.weekly_hours,
  (e.weekly_hours * 52 / 12) AS monthly_hours_available,
  DATE_TRUNC('month', t.date) AS month,
  p.funding_format,
  SUM(t.hours) AS hours_booked
FROM v7_employees e
LEFT JOIN v7_timesheets t ON t.employee_id = e.id
LEFT JOIN v7_work_packages wp ON wp.id = t.work_package_id
LEFT JOIN v7_projects p ON p.id = wp.project_id
GROUP BY e.id, DATE_TRUNC('month', t.date), p.funding_format;

-- View: FZul-verfügbare Stunden pro Mitarbeiter/Monat
CREATE VIEW v7_employee_fzul_available AS
SELECT
  employee_id,
  month,
  monthly_hours_available,
  SUM(CASE WHEN funding_format IN ('ZIM_EINZEL', 'ZIM_KOOP', 'ZIM_NETZWERK', 
                                    'ZIM_DURCHFUEHRBARKEIT', 'BMBF_KMU') 
           THEN hours_booked ELSE 0 END) AS hours_publicly_funded,
  monthly_hours_available - SUM(CASE WHEN funding_format IN ('ZIM_EINZEL', 'ZIM_KOOP', 
                                    'ZIM_NETZWERK', 'ZIM_DURCHFUEHRBARKEIT', 'BMBF_KMU') 
           THEN hours_booked ELSE 0 END) AS hours_available_for_fzul
FROM v7_employee_monthly_capacity
GROUP BY employee_id, month, monthly_hours_available;
```

---

## 6. UI-Komponenten

### 6.1 Kapazitäts-Anzeige (Komponente)

Wiederverwendbare Komponente zur Anzeige der Mitarbeiter-Auslastung:

```
┌──────────────────────────────────────────┐
│ Max Müller                    Januar 2026│
│ ─────────────────────────────────────────│
│ ████████████████████░░░░░░░░  120/173 h │
│ ├── ZIM Alpha:  80h                      │
│ ├── BMBF Beta:  40h                      │
│ └── Frei:       53h (31%)                │
└──────────────────────────────────────────┘
```

### 6.2 Verfügbarkeits-Warnung (Komponente)

Bei Zuordnung oder Zeiterfassung:

```
┌──────────────────────────────────────────┐
│ ⚠️ Eingeschränkte Verfügbarkeit          │
│                                          │
│ Lisa Schmidt ist im Zeitraum             │
│ Jan-Mar 2026 bereits zu 100% verplant.   │
│                                          │
│ [Details anzeigen] [Trotzdem zuordnen]   │
└──────────────────────────────────────────┘
```

### 6.3 FZul-Prüfung (Komponente)

Spezielle Anzeige bei FZul-Erfassung:

```
┌──────────────────────────────────────────┐
│ 📊 FZul-Verfügbarkeit Januar 2026        │
│ ─────────────────────────────────────────│
│ Gesamt:        173 h                     │
│ Gefördert:    -120 h (ZIM + BMBF)        │
│ ─────────────────────────────────────────│
│ FZul-fähig:     53 h  ✅                 │
│                                          │
│ Ihre Eingabe:   45 h                     │
│ Verbleibend:     8 h                     │
└──────────────────────────────────────────┘
```

---

## 7. Entscheidungen (geklärt am 21.01.2026)

| Nr. | Frage | Entscheidung | Begründung |
|-----|-------|--------------|------------|
| 1 | Überbuchung | **Komplett blockieren** | Keine Toleranz, System verhindert Überbuchung |
| 2 | Urlaub/Krankheit | **Ja, bereits in Zeiterfassung integriert** | Fehlzeiten werden pro Tag erfasst (Urlaub, Krankheit, Feiertag) |
| 3 | Rückwirkende Korrekturen | **Nur für client_admin und project_leader** | Mitarbeiter können nur aktuellen Monat bearbeiten |
| 4 | Plan vs. Ist-Stunden | **Beides führen** | Ermöglicht Soll-Ist-Vergleich und Restbudget-Anzeige |

---

## 8. Plan- vs. Ist-Stunden: Die Stunden-Logik im Detail

### 8.1 Drei Ebenen der Stundenerfassung

```
EBENE 1: MITARBEITER-KAPAZITÄT (Monatlich)
═══════════════════════════════════════════════════════════════
Max Müller: 40h/Woche = 173 h/Monat verfügbar
Diese Grenze darf NIEMALS überschritten werden!

EBENE 2: ARBEITSPAKET-PLANUNG (Projekt-Laufzeit)
═══════════════════════════════════════════════════════════════
AP1 "Konzeption": 3 PM geplant = 520 h über Projektlaufzeit
  └── Max Müller: 1,5 PM = 260 h geplant
  └── Lisa Schmidt: 1,5 PM = 260 h geplant

EBENE 3: IST-ERFASSUNG (Täglich/Monatlich)
═══════════════════════════════════════════════════════════════
Max Müller erfasst im Januar 2026:
  └── AP1: 45 h (von 260 h geplant)
  └── AP2: 80 h (von 400 h geplant)
  └── Summe: 125 h (unter 173 h Kapazität ✓)
```

### 8.2 Die wichtigen Regeln

**Regel 1: Monatskapazität ist HART**
```
Mitarbeiter-Monatsstunden ≤ Verfügbare Kapazität

✗ BLOCKIERT: Max (173h) bucht 180h im Januar
✓ ERLAUBT: Max (173h) bucht 170h im Januar
```

**Regel 2: AP-Stunden sind WEICH (verschiebbar)**
```
Innerhalb der Projekt-Gesamtstunden dürfen APs abweichen:

Geplant:          Gebucht:           Ergebnis:
AP1: 260 h        AP1: 200 h         -60 h unter Plan
AP2: 400 h        AP2: 460 h         +60 h über Plan
────────────      ────────────       ────────────────
Summe: 660 h      Summe: 660 h       ✓ Projekt passt!
```

**Regel 3: Projekt-Gesamtstunden müssen zum Förderantrag passen**
```
Bewilligt lt. Antrag:     12 PM = 2.080 h Personalstunden
Erfasst bisher:           1.540 h
Noch zu buchen:             540 h  ← Wichtig für Fördermaximierung!
```

### 8.3 Übersichts-Dashboard (Soll-Ist-Vergleich)

Wie in Martins Excel-Vorlage:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 Projekt "Smarte Sensortechnik" - Stundenübersicht                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Gesamt-Budget lt. Antrag:    12,0 PM = 2.080 h                        │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ STATUS           │ STUNDEN │ PM    │ ANTEIL │ BALKEN           │   │
│  ├──────────────────┼─────────┼───────┼────────┼──────────────────┤   │
│  │ ✅ Abgerechnet   │   800 h │ 4,6PM │   38%  │ ████████░░░░░░░░ │   │
│  │ 📝 Erfasst       │   740 h │ 4,3PM │   36%  │ ███████░░░░░░░░░ │   │
│  │ ⏳ Offen         │   540 h │ 3,1PM │   26%  │ █████░░░░░░░░░░░ │   │
│  └──────────────────┴─────────┴───────┴────────┴──────────────────┘   │
│                                                                         │
│  ⚠️ Noch 540 h zu buchen bis Projektende (31.03.2027)                  │
│     → ca. 36 h/Monat auf 15 Restmonate verteilen                       │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ AUFSCHLÜSSELUNG NACH ARBEITSPAKET                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  AP     │ GEPLANT │ ERFASST │ DIFF   │ STATUS                          │
│  ───────┼─────────┼─────────┼────────┼─────────────────────────────────│
│  AP1    │   520 h │   480 h │  -40 h │ 🟡 Leicht unter Plan            │
│  AP1.1  │   173 h │   180 h │   +7 h │ 🟢 Im Plan                      │
│  AP1.2  │   347 h │   300 h │  -47 h │ 🟡 Unter Plan                   │
│  AP2    │   867 h │   920 h │  +53 h │ 🟢 Leicht über Plan             │
│  AP3    │   347 h │   140 h │ -207 h │ 🔴 Stark unter Plan             │
│  AP4    │   346 h │     0 h │ -346 h │ ⚪ Noch nicht begonnen          │
│  ───────┼─────────┼─────────┼────────┼─────────────────────────────────│
│  SUMME  │ 2.080 h │ 1.540 h │ -540 h │ Projekt: 74% erfasst            │
│                                                                         │
│  ✓ Verschiebungen zwischen APs sind erlaubt                            │
│  ✓ Gesamtsumme muss zum Antrag passen (±5% Toleranz)                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.4 Mitarbeiter-Ansicht (pro Person)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 👤 Max Müller - Stundenübersicht 2026                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Monat   │ Kapazität │ Projekt A │ Projekt B │ FZul │ Frei │ Status   │
│  ────────┼───────────┼───────────┼───────────┼──────┼──────┼──────────│
│  Jan     │   173 h   │    80 h   │    40 h   │  30h │  23h │ ✓ Ok     │
│  Feb     │   173 h   │    90 h   │    50 h   │  33h │   0h │ ⚠️ Voll  │
│  Mär     │   173 h   │    60 h   │    30 h   │   0h │  83h │ ✓ Ok     │
│  Apr     │   173 h   │     - h   │     - h   │   -h │   -h │ ○ Offen  │
│  ...     │           │           │           │      │      │          │
│  ────────┼───────────┼───────────┼───────────┼──────┼──────┼──────────│
│  Summe   │ 2.080 h   │   230 h   │   120 h   │  63h │ ...  │          │
│                                                                         │
│  Geplant für Max Müller (alle Projekte):                               │
│    Projekt A: 6 PM = 1.040 h → Erfasst: 230 h → Offen: 810 h          │
│    Projekt B: 3 PM =   520 h → Erfasst: 120 h → Offen: 400 h          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.5 Statusbegriffe

| Status | Bedeutung | Wohin fließt es? |
|--------|-----------|------------------|
| **Geplant** | PM lt. Antrag (Budget) | Referenzwert aus Förderantrag |
| **Erfasst** | Stunden in Zeiterfassung eingetragen | Zeiterfassungs-Modul |
| **Abgerechnet** | In Zahlungsanforderung eingereicht | Abrechnungs-Modul |
| **Offen** | Differenz Geplant - Erfasst | Noch zu leistende Arbeit |
| **Frei** | Kapazität - alle Projekte | Verfügbar für FZul oder andere Arbeit |

### 8.6 Fehlzeiten-Berücksichtigung

Die verfügbare Monatskapazität reduziert sich durch Fehlzeiten:

```
Max Müller - Januar 2026
═══════════════════════════════════════════════════════════════

Basis-Kapazität:           173 h  (40h × 52 ÷ 12)

Fehlzeiten (aus Zeiterfassung):
  - Urlaub:                -16 h  (2 Tage × 8h)
  - Krankheit:              -8 h  (1 Tag × 8h)
  - Feiertag:               -8 h  (1 Tag × 8h)
  ─────────────────────────────────
  = Summe Fehlzeiten:      -32 h

Tatsächlich verfügbar:     141 h  ← Diese Grenze gilt!

Bereits gebucht:
  - Projekt A:              80 h
  - Projekt B:              40 h
  ─────────────────────────────────
  = Summe gebucht:         120 h

Noch buchbar (Jan):         21 h  (für Projekte oder FZul)
```

---

## 9. Nächste Schritte

1. ☐ Konzept mit Martin abstimmen
2. ☐ Datenbank-Views für Kapazitätsberechnung erstellen
3. ☐ Kapazitäts-Komponente entwickeln (CapacityBar)
4. ☐ Überbuchungs-Blockierung implementieren
5. ☐ Soll-Ist-Dashboard erstellen (Projektübersicht)
6. ☐ Mitarbeiter-Stundenübersicht erstellen
7. ☐ FZul-Prüfung implementieren
8. ☐ Fehlzeiten in Kapazitätsberechnung integrieren

---

*Erstellt: 21. Januar 2026*
*Letzte Änderung: 21. Januar 2026*
