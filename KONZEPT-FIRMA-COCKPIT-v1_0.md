# KONZEPT: Firma-Cockpit als MIS
**Version:** 1.0
**Datum:** 7. Mai 2026
**Status:** Konzept (Implementierung ausstehend)

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

## 2. Zielstruktur Berater-Navigation

```
Berater-Dashboard
  |-- Netzwerke
  |-- Kundenfirmen -> [Firma A Cockpit]
  |-- Kapazitaetsplanung

Firma A Cockpit (neu)
  |-- Mitarbeiter (konsolidiert)
  |-- Projekte
      |-- Arbeitsplan
      |-- Projekt-Fortschritt
  |-- ZA / Finanzen
      |-- ZA-Uebersicht
      |-- Daten fuer ZA
  |-- Stundennachweise
```

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

- Zeigt in welchen Projekten jeder MA aktiv ist
- Direktlink zu Zeiterfassung pro MA/Projekt
- Ersetzt separaten "Team"-Tab in Projektdetailseite

### Mittlere Spalte: Projekte

Pro Projekt kompakte Karte:
- FKZ, Titel (kurz), Laufzeit, Foerderformat
- Ampelstatus Zeiterfassung (aktueller Monat)
- Plan-PM vs. Ist-PM (Mini-Fortschrittsbalken)
- Direktlinks: Arbeitsplan | Zeiterfassung | Fortschritt | ZA

### Rechte Spalte: Finanzen (NEU)

**ZA-Uebersicht:**
| ZA | Zeitraum | Eingereicht | Betrag | Zahlungseingang | Offen |
|----|----------|-------------|--------|-----------------|-------|
| ZA 1 | Nov-Dez 25 | 15.01.26 | 12.450 EUR | 28.02.26 / 12.450 EUR | - |
| ZA 2 | Jan-Feb 26 | 10.03.26 | 9.800 EUR | -- | 9.800 EUR |
| Summe | | | 22.250 EUR | 12.450 EUR | 9.800 EUR |

**Neue DB-Felder erforderlich (v7_zahlungsanforderungen):**
- `zahlungseingang_datum` DATE
- `zahlungseingang_betrag` NUMERIC(12,2)

---

## 4. Konsolidierung MA-Daten

**Aktuell (Problem):**
- Berater-Portal: Firmendaten > Mitarbeiter (Stammdaten, Teilzeit, Login)
- Projektdetail > Team-Tab (Rolle im Projekt, Stundensatz, lfd. Nr.)

**Ziel:**
- Eine einzige MA-Uebersicht im Firma-Cockpit
- Stammdaten + Projektzuordnungen in einer Ansicht
- Team-Tab in Projektdetail entfaellt (oder wird readonly-Summary)

---

## 5. Permanent sichtbare Kerndaten (Berater)

Wenn Berater in Firma-Kontext ist, sollen folgende Daten immer sichtbar sein
(z.B. als Sticky-Header oder Sidebar):
- Firmenname + Ansprechpartner mit Tel/E-Mail
- Liste der aktiven Projekte mit FKZ
- Aktueller Zeiterfassungsstatus (wieviele MA haben laufenden Monat abgeschlossen)

---

## 6. Neue DB-Felder

### v7_zahlungsanforderungen (Erweiterung)
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| zahlungseingang_datum | DATE | Datum des Zahlungseingangs (nullable) |
| zahlungseingang_betrag | NUMERIC(12,2) | Betrag des Zahlungseingangs (nullable) |

### Keine weiteren Schema-Aenderungen noetig
Alle anderen Cockpit-Daten lassen sich aus bestehenden Tabellen ableiten.

---

## 7. Implementierungs-Reihenfolge

1. **SQL-Migration:** zahlungseingang_datum + zahlungseingang_betrag
2. **ZAPanel erweitern:** Zahlungseingang eintragbar (Datum + Betrag)
3. **Firma-Cockpit Seite:** Neue Seite /v7/berater/foerderung/firma/[id]/cockpit
4. **Bestehende Berater-Firma-Detail-Seite:** Umleitung auf Cockpit oder Integration
5. **MA-Konsolidierung:** Team-Tab vereinfachen, MA-Matrix ins Cockpit

---

## 8. Offene Fragen

- Loest das Cockpit die bestehende Berater-Firma-Detailseite ab oder ergaenzt es sie?
- Soll das Cockpit auch im Firmen-Portal verfuegbar sein (fuer Admin)?
- Wie tief soll die MA-Matrix gehen (alle Projekte, nur aktive)?
- Soll der Zahlungseingang auch teilweise moeglich sein (Teilzahlung)?

---

**Ende Konzept v1.0**
