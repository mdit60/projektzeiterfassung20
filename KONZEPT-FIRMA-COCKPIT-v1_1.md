# KONZEPT: Firma-Cockpit als MIS
**Version:** 1.1
**Datum:** 7. Mai 2026
**Status:** Grundlagen implementiert (ZAPanel), Cockpit-Seite folgt Session 40+

---

## Aenderungshistorie
| Version | Datum | Aenderung |
|---------|-------|-----------|
| 1.1 | 07.05.2026 | Entscheidungen A-D getroffen, DB-Felder implementiert, ZAPanel-Archiv fertig |
| 1.0 | 07.05.2026 | Erstversion |

---

## 1. Motivation

Das PZE-System ist organisch gewachsen. Jede Funktion ist in sich korrekt,
aber der Gesamtfluss fuer den Berater im Tagesgeschaeft ist nicht optimiert.

**Aktuelles Problem:**
- Berater muss zu viele verschiedene Stellen navigieren
- MA-Daten an zwei Stellen (Firmen-MA-Liste + Projekt-Team-Tab)
- Keine Finanzuebersicht (ZA-Betraege, Zahlungseingaenge)
- Keine Firma-Stammdaten permanent sichtbar beim Berater
- Navigationspfad: Berater-Dashboard -> Firma -> Projekt -> Tab -> ... zu tief

**Ziel:** Pro Firma ein **Cockpit** das alle relevanten Informationen auf einen
Blick zeigt -- im Sinne eines MIS (Management Information System).

---

## 2. Entscheidungen (Session 39, 07.05.2026)

### A) Cockpit loest Berater-Firma-Detailseite ab
Das Cockpit ist die Landing Page wenn der Berater aus seinem Dashboard auf eine
Firma klickt. Die bisherige Berater-Firma-Detailseite wird durch das Cockpit
ersetzt (nicht ergaenzt).

### B) Cockpit auch im Firmen-Portal (Firmen-Admin)
Ja. Der Firmen-Admin landet nach dem Login direkt auf dem Cockpit seiner Firma.
Berater und Firmen-Admin sehen dasselbe Cockpit (Shared Component, portal-Parameter
steuert Farbe). Das Cockpit ist das "Shared Document" beider Rollen.

### C) MA-Matrix: nur aktive Projekte, vergangene abrufbar
- Anzeige: nur aktive Projekte pro MA
- Vergangene Projekte ueber ausklappbaren Bereich abrufbar
- Ziel: Seite nicht ueberfrachten

### D) Zahlungseingang: Betrag kann vom ZA-Betrag abweichen
Der Projekttraeger kann den angeforderten Betrag kuerzern. Daher:
- `zahlungseingang_betrag` ist ein separates Feld (unabhaengig vom ZA-Foerderbetrag)
- `zahlungseingang_kommentar` dokumentiert den Grund einer Kuerzung (neu ggue. v1.0)

---

## 3. Firma-Cockpit Aufbau (3-Spalten-Layout)

### Linke Spalte: Firma + Mitarbeiter

**Firmenkopf (permanent sichtbar):**
- Firmenname, Ansprechpartner, Tel, E-Mail
- Bundesland, Feiertagsregion

**Mitarbeiter-Matrix:**
| MA | Position | Rolle | Wo-Std | Projekt 1 | Projekt 2 | ... |
|----|----------|-------|--------|-----------|-----------|-----|
| Meier, Hans | GF | Admin | 40h | AP1-3 | - |
| Schmidt, Eva | Ing. | MA | 38h | AP2-5 | AP1 |

- Nur aktive Projekte angezeigt; vergangene abrufbar (ausgeklappt)
- Direktlink zu Zeiterfassung pro MA/Projekt

### Mittlere Spalte: Projekte

Pro Projekt kompakte Karte:
- FKZ, Titel (kurz), Laufzeit, Foerderformat
- Ampelstatus Zeiterfassung (aktueller Monat)
- Plan-PM vs. Ist-PM (Mini-Fortschrittsbalken)
- Direktlinks: Arbeitsplan | Zeiterfassung | Fortschritt | ZA

### Rechte Spalte: Finanzen

**ZA-Uebersicht (implementiert im ZAPanel-Archiv-Tab):**
| ZA | Zeitraum | Datum | Betrag | Zahlungseingang | Betrag | Anmerkung | Status |
|----|----------|-------|--------|-----------------|--------|-----------|--------|
| ZA 1 | Nov-Jan | 15.01.26 | 6.935 EUR | 28.02.26 | 6.935 EUR | - | Bewilligt |
| ZA 2 | Feb-Apr | 10.04.26 | 8.180 EUR | -- | 0,00 | - | Eingereicht |

**Summenzeile (Cockpit-Seite, noch nicht implementiert):**
- Gesamt angefordert | Eingegangen | Offen

---

## 4. DB-Erweiterung (implementiert Session 39)

### v7_zahlungsanforderungen
| Feld | Typ | Beschreibung | Status |
|------|-----|--------------|--------|
| zahlungseingang_datum | DATE | Datum Zahlungseingang (nullable) | DEV migriert |
| zahlungseingang_betrag | NUMERIC(12,2) | Eingegangener Betrag, kann abweichen | DEV migriert |
| zahlungseingang_kommentar | TEXT | Grund Kuerzung o.ae. (nullable) | DEV migriert |
| foerderbetrag_gesamt | NUMERIC(12,2) | Berechneter Foerderbetrag, fest gespeichert | DEV migriert |

**Alle 4 Felder noch auf PROD-Supabase zu migrieren (nach erfolgreichem DEV-Test).**

---

## 5. ZAPanel Archiv-Tab (implementiert Session 39)

Neues Archiv-Tab-Layout (ZAPanel v7.4.4-40):
- Spalten: ZA Nr. | Zeitraum | Datum | Betrag | Zahlungseingang | Betrag | Anmerkung | Status | [Sichern] [Oeffnen] [Loeschen]
- Zahlungseingang, Betrag, Anmerkung: direkt inline editierbar, "Sichern" pro Zeile
- Foerderbetrag: immer live berechnet aus Timesheet-Daten (auch Entwurf), zusaetzlich in DB gespeichert
- Einreichdatum: direkt im Deckblatt-Formular (Zeile 3, neben ZA-Nr.), editierbar, wird nie automatisch ueberschrieben
- ZA loeschbar mit Bestaetigung (staerkere Warnung bei Status Eingereicht/Bewilligt)

---

## 6. Implementierungs-Reihenfolge (aktualisiert)

| Schritt | Was | Status |
|---------|-----|--------|
| 1 | SQL-Migration DEV: 4 neue Felder | DONE (Session 39) |
| 2 | ZAPanel Archiv-Tab + Zahlungseingang | DONE (Session 39, v7.4.4-34 bis -40) |
| 3 | SQL-Migration PROD | Offen (nach DEV-Test) |
| 4 | Cockpit-Seite: /v7/berater/foerderung/firma/[id]/cockpit | Session 40+ |
| 5 | Firmen-Portal: Admin landet auf Cockpit | Session 40+ |
| 6 | MA-Matrix konsolidiert | Session 40+ |
| 7 | Summenzeile Finanzen | Session 40+ |

---

**Ende Konzept v1.1**
