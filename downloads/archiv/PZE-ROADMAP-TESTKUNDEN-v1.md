# PZE Roadmap: Schnelle Testkunden-Bereitstellung

**Datum:** 06. Februar 2026  
**Ziel:** M1 (Projektmodul) + M2 (Arbeitszeitmodul) für Testkunden bereitstellen  
**Zeitrahmen:** 1-2 Wochen

---

## 🚨 BLOCKER: Vercel Production Bug

**Problem:** Localhost funktioniert, Vercel zeigt "Application Error"  
**Ursache:** `.filter()` wird auf `undefined` aufgerufen (Race Condition im Production Build)  
**Priorität:** KRITISCH - ohne Fix keine Testkunden möglich

### Lösung (heute):

1. **Systematische Suche ALLER unsicheren Array-Operationen:**
```bash
grep -rn "\.filter(\|\.map(\|\.find(\|\.forEach(\|\.reduce(" \
  ~/Documents/Dev/PZE/src/ --include="*.tsx" | \
  grep -v "|| \[\]" | grep -v "\?\." | wc -l
```

2. **Globaler Fix mit ESLint-Regel** oder manuelles Durchgehen

3. **Testen auf Vercel** nach jedem Fix

**Geschätzter Aufwand:** 2-4 Stunden

---

## 📋 Roadmap Übersicht

| Phase | Dauer | Ziel |
|-------|-------|------|
| **Phase 0** | 1 Tag | Vercel-Bug fixen |
| **Phase 1** | 2-3 Tage | Modul-UI + Landing Page |
| **Phase 2** | 2-3 Tage | M1 + M2 polieren |
| **Phase 3** | 1-2 Tage | Testkunden-Onboarding |
| **Gesamt** | **7-10 Tage** | **Testkunden können starten** |

---

## Phase 0: Vercel-Bug fixen (HEUTE)

### 0.1 Alle unsicheren Stellen finden
```bash
# Suche alle .filter(), .map(), .find() ohne Null-Safety
grep -rn "\.filter(\|\.map(\|\.find(" ~/Documents/Dev/PZE/src/ \
  --include="*.tsx" | grep -v "|| \[\]" | grep -v "\?\."
```

### 0.2 Systematisch fixen
Jede Stelle ändern von:
```javascript
// VORHER (unsicher)
items.filter(x => x.active)

// NACHHER (sicher)
(items || []).filter(x => x.active)
```

### 0.3 Deployment testen
- Nach jedem größeren Fix: Push + Vercel testen
- Ziel: Alle Seiten laden ohne Error

### Erfolgskriterium Phase 0:
✅ Vercel zeigt keine "Application Error" mehr  
✅ Alle Tabs funktionieren (Projekte, Mitarbeiter, Zeiterfassung, Berichte)

---

## Phase 1: Modul-UI erstellen (2-3 Tage)

### 1.1 Neues Berater-Dashboard mit Modul-Kacheln

**Route:** `/v7/berater` (existiert bereits, muss angepasst werden)

```
┌────────────────────────────────────────────────────────────────┐
│  PZE                                        Martin D.  [Exit]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│     Willkommen bei PZE - Projektzeiterfassung                  │
│                                                                │
│  ┌─────────────────────────┐  ┌─────────────────────────┐     │
│  │                         │  │                         │     │
│  │  📁 PROJEKTMODUL        │  │  ⏱️ ARBEITSZEITMODUL    │     │
│  │                         │  │                         │     │
│  │  Projekte anlegen und   │  │  Stunden erfassen und   │     │
│  │  verwalten. Arbeits-    │  │  auswerten. Berichte    │     │
│  │  pakete definieren.     │  │  erstellen.             │     │
│  │                         │  │                         │     │
│  │  • 3 Firmen             │  │  • Februar 2026         │     │
│  │  • 5 Projekte aktiv     │  │  • 85% erfasst          │     │
│  │                         │  │                         │     │
│  │  [Öffnen →]             │  │  [Öffnen →]             │     │
│  │                         │  │                         │     │
│  └─────────────────────────┘  └─────────────────────────┘     │
│                                                                │
│  ┌─────────────────────────┐  ┌─────────────────────────┐     │
│  │  🔬 FZUL-MODUL          │  │  📊 WEITERE MODULE      │     │
│  │  (Coming Soon)          │  │  (In Planung)           │     │
│  │                         │  │                         │     │
│  │  Forschungszulage       │  │  • Zahlungsanforderung  │     │
│  │  berechnen              │  │  • De-minimis           │     │
│  │                         │  │  • Verwendungsnachweis  │     │
│  │  [Demnächst verfügbar]  │  │                         │     │
│  └─────────────────────────┘  └─────────────────────────┘     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 1.2 Ähnliches Firmen-Dashboard

**Route:** `/v7/firma/dashboard`

Gleiche Struktur, aber aus Firmen-Perspektive (nur eigene Daten)

### 1.3 Aufgaben Phase 1

| Task | Aufwand | Priorität |
|------|---------|-----------|
| Berater-Dashboard mit Modul-Kacheln | 4h | Hoch |
| Firma-Dashboard mit Modul-Kacheln | 3h | Hoch |
| Navigation anpassen | 2h | Hoch |
| Responsive Design prüfen | 2h | Mittel |

### Erfolgskriterium Phase 1:
✅ Klare Modul-Struktur sichtbar  
✅ Intuitive Navigation zwischen Modulen  
✅ Professionelles Erscheinungsbild

---

## Phase 2: M1 + M2 polieren (2-3 Tage)

### 2.1 Projektmodul (M1) - Was fehlt für 90%?

| Feature | Status | Aufwand |
|---------|--------|---------|
| Projekt anlegen (manuell) | ✅ Fertig | - |
| Projekt anlegen (ZIM-Import) | ✅ Fertig | - |
| Arbeitspakete verwalten | ✅ Fertig | - |
| Team zuordnen | ✅ Fertig | - |
| Excel-Import Arbeitsplan | ✅ Fertig | - |
| **Projekt-Status anzeigen** | ⚠️ Teilweise | 2h |
| **Projekt bearbeiten (alle Felder)** | ⚠️ Prüfen | 2h |

### 2.2 Arbeitszeitmodul (M2) - Was fehlt für 90%?

| Feature | Status | Aufwand |
|---------|--------|---------|
| Monatserfassung | ✅ Fertig | - |
| Fehlzeiten (U/K/S) | ✅ Fertig | - |
| Speichern-Dialog | ✅ Fertig | - |
| T-Spalte (technische APs) | ✅ Fertig | - |
| MA-Sortierung | ✅ Fertig | - |
| **Berichte (Plan/Ist)** | ✅ Grundlage da | 2h polieren |
| **PDF-Export Stundennachweis** | 🔲 Fehlt | 4-6h |
| **Monatsabschluss** | 🔲 Optional | Später |

### 2.3 Aufgaben Phase 2

| Task | Aufwand | Priorität |
|------|---------|-----------|
| Projekt-Bearbeitung prüfen/fixen | 2h | Hoch |
| Berichte-Seite polieren | 2h | Hoch |
| PDF-Export (einfache Version) | 4h | Mittel |
| Fehlermeldungen verbessern | 2h | Mittel |
| Loading-States überall | 2h | Mittel |

### Erfolgskriterium Phase 2:
✅ Testkunde kann Projekt anlegen  
✅ Testkunde kann Stunden erfassen  
✅ Testkunde kann Bericht einsehen  
✅ Keine offensichtlichen Bugs

---

## Phase 3: Testkunden-Onboarding (1-2 Tage)

### 3.1 Technische Vorbereitung

| Task | Aufwand |
|------|---------|
| Testkunden-Firma in Supabase anlegen | 30min |
| Testkunden-User erstellen | 30min |
| Test-Projekt mit Beispieldaten | 1h |
| Dokumentation/Anleitung schreiben | 2h |

### 3.2 Onboarding-Material

- [ ] Kurzanleitung (1-2 Seiten PDF)
- [ ] Video-Walkthrough (optional, 5min)
- [ ] Support-Kanal (E-Mail? WhatsApp?)

### 3.3 Feedback-Prozess

- [ ] Feedback-Formular oder einfach per E-Mail
- [ ] Wöchentliches Check-in mit Testkunden

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| Vercel-Bug nicht lösbar | Mittel | Alternativ: Hetzner sofort aufsetzen |
| Testkunden finden schwere Bugs | Hoch | Intensive interne Tests vorher |
| Performance-Probleme | Niedrig | Monitoring einrichten |
| Testkunden überfordert | Mittel | Gute Dokumentation, persönlicher Support |

---

## Zeitplan (optimistisch)

| Tag | Datum | Aufgaben |
|-----|-------|----------|
| 1 | Do, 06.02. | Phase 0: Vercel-Bug fixen |
| 2 | Fr, 07.02. | Phase 1: Modul-Dashboard Berater |
| 3 | Mo, 10.02. | Phase 1: Modul-Dashboard Firma + Navigation |
| 4 | Di, 11.02. | Phase 2: M1 + M2 polieren |
| 5 | Mi, 12.02. | Phase 2: Berichte + PDF-Export |
| 6 | Do, 13.02. | Phase 3: Testkunden-Setup |
| 7 | Fr, 14.02. | Phase 3: Dokumentation + Go-Live |

**Ziel: Testkunden-Start am 14. Februar 2026** 🎯

---

## Entscheidungen für heute

1. **Vercel-Bug:** Systematisch alle Array-Operationen fixen
2. **Testkunden:** Wer sind die ersten 1-2 Testkunden? (Eigene Firma? Echter Kunde?)
3. **PDF-Export:** Jetzt oder später? (Kann auch nach Go-Live kommen)
4. **Support-Kanal:** E-Mail reicht für Anfang?

---

## Nächster Schritt (JETZT)

```bash
# Starten mit Phase 0 - Alle unsicheren Stellen finden
cd ~/Documents/Dev/PZE
grep -rn "\.filter(\|\.map(\|\.find(" src/ --include="*.tsx" | \
  grep -v "|| \[\]" | grep -v "\?\." | wc -l
```

Das zeigt uns wie viele Stellen wir fixen müssen.
