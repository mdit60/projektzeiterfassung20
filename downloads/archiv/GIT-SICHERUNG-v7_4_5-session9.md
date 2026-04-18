# GIT-Sicherung Session 9 - 28. Maerz 2026

## Status
- Branch: v7-dev + main deployed
- Production: pze.itenion.com
- Letzte Version dieser Session: v7.4.5-2 / v7.4.4-19 / v7.4.1-2

---

## Was in Session 9 erfolgreich deployed wurde

### 1. berichte-page-v7_4_4-19.tsx
**Ziel:** `src/app/v7/firma/berichte/page.tsx`

**Bug-Fix:** Projektfortschritt-Kachel zeigte "Demnaechst" obwohl Code korrekt war.
**Ursache:** Datei im Projektverzeichnis war noch v7.4.4-14 (alter Stand), nie korrekt deployed.
**Loesung:** Kompletter Neuaufbau der Datei als -19.

Aenderungen gegenueber -14:
- Kachel 3 "Projekt-Fortschritt" jetzt aktiv (Button mit showFortschritt State)
- ProjektFortschrittPanel korrekt importiert und eingebunden
- Trigger-Zeile am Ende entfernt
- Footer-Version aktualisiert

### 2. ProjektFortschrittPanel-v7_4_5-2.tsx
**Ziel:** `src/components/shared/ProjektFortschrittPanel.tsx`
**Gilt fuer:** Beide Portale (shared component, portal-Parameter steuert Farbe)

Komplett neu: Monatsverlauf-Diagramm als ComposedChart

- WorkPackage-Interface um start_date/end_date erweitert
- AP-genaue Soll-Verteilung: Planstunden = Summe(MA-PM * 173.33) je AP,
  gleichmaessig verteilt ueber AP-Laufzeit (tagesgenau anteilig je Monat)
- Alle APs pro Kalendermonat summiert = monatlicher Soll-Wert
- ComposedChart mit zwei Y-Achsen:
  - Links: Stunden/Monat (Saeulen: Soll grau / Ist akzentfarbe)
  - Rechts: Kumuliert (Linien: Soll gestrichelt / Ist durchgezogen)
- Tooltip zeigt alle 4 Werte pro Monat
- Legende mit korrekten Bezeichnungen
- Fussnote: AP-genaue Verteilungslogik erklaert

### 3. berater-berichte-page-v7_4_4-19.tsx
**Ziel:** `src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx`

Analog zur Firmen-Berichte-Seite aktualisiert:
- ProjektFortschrittPanel importiert (portal="berater" -> blaue Farbe)
- showFortschritt State ergaenzt
- Kachel 3 "Projekt-Fortschritt" aktiviert (war "Demnaechst")
- WorkPackages-Query um start_date/end_date erweitert
- Zurueck-Link zeigt jetzt auf Firma-Detail statt Dashboard
- Footer-Version aktualisiert

### 4. foerderung-page-v7_4_1-2.tsx
**Ziel:** `src/app/v7/berater/foerderung/page.tsx`

Bereinigung ungenutzter Onboarding-Mechanismen:
- Einladungslink-Button entfernt (copyInviteLink, generateInviteLink)
- Einladungslink-Modal entfernt (showInviteModal, inviteCompany States)
- "Aktivieren"-Button entfernt (activateCompany Funktion)
- Status-Filter vereinfacht: nur noch "Aktiv" und "Inaktiv"
- Status-Anzeige vereinfacht: invited/registered/active -> alle gruen "Aktiv"
- Neue Firmen bekommen immer direkt status: 'active'
- DB-Felder (invitation_token, invited_at etc.) ERHALTEN fuer spaetere
  Selbstregistrierungs-Implementierung (siehe Pflichtenheft 12.3)

---

## Dateien in Downloads (Session 9)

| Dateiname | Ziel | Status |
|-----------|------|--------|
| berichte-page-v7_4_4-19.tsx | src/app/v7/firma/berichte/page.tsx | deployed |
| ProjektFortschrittPanel-v7_4_5-2.tsx | src/components/shared/ProjektFortschrittPanel.tsx | deployed |
| berater-berichte-page-v7_4_4-19.tsx | src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx | deployed |
| foerderung-page-v7_4_1-2.tsx | src/app/v7/berater/foerderung/page.tsx | deployed |
| PFLICHTENHEFT-v4_50.md | downloads/ | aktualisiert |
| GIT-SICHERUNG-v7_4_5-session9.md | downloads/ | diese Datei |

---

## Offene Punkte (naechste Session)

### Carry-over aus frueheren Sessions
- Firma-Detailseite Berater-Portal: Header gruen statt blau (Bug 5.9)
- ZA-Rollback-Button: Bewilligt -> Eingereicht
- Stundensatz-Diskrepanz Annika Arndt (20.19 vs. 20.35 EUR/h)

### NWM-Modul (produktiv mit YachtConnect)
- USt-Behandlung Option B mit Katrin bestaetigen
- Erste echte ZA-Periode (Aug-Okt 25) berechnen und einreichen
- Rechnungs-PDF und PT-Nachweis in Praxis testen

### Neue Features (priorisiert)
1. Berater-Portal User Manual (PDF)
2. ZIM PDF Import im Firmen-Portal aktivieren
3. Multiprojekt-Tool: Konzept + Implementierung
4. Forschungszulage-Kachel: Konzept + Implementierung

### Langfristig (Konzept-Merker)
- Selbstregistrierung / SaaS-Direktvertrieb (siehe Pflichtenheft 12.3)
  Grundlagen vorhanden: DB-Felder, API-Route, Git-History
  Noch fehlend: Stripe, Onboarding-Flow, DSGVO-Rahmenprogramm

---

## Pflichtenheft
**Version:** 4.50
**Datei:** PFLICHTENHEFT-v4_50.md
