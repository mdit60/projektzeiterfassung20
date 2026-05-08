# GIT-SICHERUNG Session 40

**Datum:** 8. Mai 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v4.86
**Branch:** v7-dev

---

## Zusammenfassung Session 40: Firma-Cockpit Implementierung

### Neue Komponenten

| Datei | Version | Beschreibung |
|-------|---------|--------------|
| FirmaCockpit.tsx | v7.4.9-5 | Shared Component: 3-Spalten-Layout (2/6/4), Firmenkopf, Projekte mit KPIs, ZA-Tabelle |
| cockpit/page.tsx | v7.4.9-1 | Test-Route /v7/berater/foerderung/firma/[id]/cockpit |
| cockpit/fortschritt/page.tsx | v7.4.9-4 | Eigenstaendige Seite fuer ProjektFortschrittPanel |
| cockpit/stundennachweis/page.tsx | v7.4.9-4 | Eigenstaendige Seite fuer StundennachweisMatrix |

### Geaenderte Komponenten

| Datei | Version | Aenderung |
|-------|---------|-----------|
| PortalHeader.tsx | v7.3.95-4 | Home-Button (Haeuschen) ganz links im Header, fuehrt zum Cockpit |
| PortalNav.tsx | v7.4.4-14 | Home-Button in Nav-Zeile (wird durch Header-Loesung ersetzt) |
| ProjectDetailPage.tsx | v7.4.4-57 | returnTo-Parameter + einheitliches "Zurueck"-Label |

### Architektur-Entscheidungen

1. **Firma-Cockpit ersetzt Berater-Firma-Detailseite**
   - Berater-Dashboard (Hub) bleibt unveraendert
   - Klick auf Firma -> Cockpit (statt bisherige Tab-Detailseite)
   - Alte Detailseite bleibt parallel erreichbar waehrend Entwicklung
   - Test-Route: /v7/berater/foerderung/firma/[id]/cockpit

2. **Navigationskonzept**
   - Haeuschen im Header: immer sichtbar, fuehrt zum Cockpit (Home-Base)
   - Zurueck-Pfeil: kontextbezogen, fuehrt zur vorherigen Seite (router.back())
   - Zwei getrennte Ebenen: Home != Zurueck

3. **Drei Buttons pro Projektkarte**
   - Projektdaten -> ProjectDetailPage (mit returnTo)
   - Projektfortschritt -> Eigenstaendige Seite (ohne BerichtePage-Huelle)
   - Stundennachweis -> Eigenstaendige Seite (ohne BerichtePage-Huelle)

4. **ZA-Anzeige**
   - Status aus Daten abgeleitet (kein manuelles Dropdown)
   - eingereicht_am vorhanden -> "Eingereicht"
   - zahlungseingang_datum vorhanden -> "Ausgezahlt"
   - Tabelle mit 7 Spalten: ZA | Eingereicht | Anforderung | Zahlung | Betrag | Differenz | Kommentar
   - Gruppiert nach Projekt (Kuerzel + FKZ)
   - Sortiert nach ZA-Nummer aufsteigend

5. **Umbenennung System-Rolle (beschlossen, noch nicht umgesetzt)**
   - "Projektleiter" (portal_role) -> "Projektkoordinator"
   - Projekt-Funktion "Projektleiter" (role_in_project) bleibt
   - Eigenes Arbeitspaket

### Offen fuer Session 41

1. **Berechnungs-Utility extrahieren** (`lib/projektfortschritt-utils.ts`)
   - Monatsverlauf, Prognose, Szenarien als wiederverwendbare Funktionen
   - Wird von FirmaCockpit und ProjektFortschrittPanel genutzt
2. **Kompakter Monatsverlauf + Prognose im Cockpit** (mittlere Spalte)
3. **Cockpit breiter machen** (bereits umgesetzt in v7.4.9-5)
4. **GIT-Sicherung neue Regel:** nur git push v7-dev, kein Merge auf main

### Git-Status

Frischer Clone nach Pack-File-Korruption.
Alle Aenderungen auf v7-dev gepusht bis auf FirmaCockpit v7.4.9-5 (lokal).

---

## Commit-Befehle

```bash
cd ~/Documents/Dev/pze
git add -A
git commit -m "Session 40: GIT-Sicherung v7.4.9 - Firma-Cockpit Implementierung"
git push origin v7-dev
```
