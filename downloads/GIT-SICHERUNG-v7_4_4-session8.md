# GIT-Sicherung Session 8 - 26. Maerz 2026

## Status
- Branch: v7-dev + main deployed
- Production: pze.itenion.com
- Letzte Commits dieser Session: v7.4.3-12

## Was in Session 8 erfolgreich deployed wurde

### 1. TimesheetForm-v7_4_3-12.tsx
**Ziel:** `src/components/shared/TimesheetForm.tsx`
**Basis:** v7_4_3-9 (nicht -10 oder -11 - diese hatten CSS-Probleme)

**Fixes:**
- FIX TS1117: Doppelter Key 'Baden-Wuerttemberg' in normalizeStateCode entfernt
- FIX TS1117: Doppelter Key 'Thueringen' in normalizeStateCode entfernt
- FIX PDF-Export: Kein Popup-Fenster mehr (CSS ging im Popup verloren)
  Neu: window.print() direkt im gleichen Tab
  Neu: replaceSelectsForPrint() ersetzt select-Elemente vor Drucken durch
       lesbare span-Texte, stellt nach Drucken wieder her
  Neu: document.title = Dateiname vor Print (fuer PDF-Speichern-Dialog)
- Print-CSS: Identisch mit bewaeehrter -9-Version, nur
  select { display: none } statt appearance: none (Sicherheitsnetz)
- git merge --no-edit ab sofort in Deployment-Befehlen

**WICHTIGE LEKTION Session 8:**
Funktionierenden Code NIEMALS umstrukturieren.
Korrekturen nur chirurgisch - ausschliesslich betroffene Zeilen.
Gilt insbesondere fuer CSS, Print-Styles und Layout.

## Konzeptarbeit Session 8 (keine Implementierung)

### KONZEPT-ZIM-NETZWERKMANAGEMENT-v1_2.md
Vollstaendiges Konzept fuer das NWM-Modul erarbeitet.
Zwei Schwerpunkte:

**1. Gestaffelte Foerderquoten (ZA-Integration)**
- National: Phase 1: 90%, Phase 2: 70/50/30%
- International: Phase 1: 95%, Phase 2: 80/60/40%
- Foerdersatz automatisch aus Laufzeitjahr berechnet
- Feld foerdersatz_stufen JSONB in v7_projects

**2. NP-Eigenanteil-Modul**
- Quartalsweise Abrechnung (zusammen mit ZA)
- NWM-Kosten aus PZE-Zeiterfassung (foerderfaehige Stunden x hourly_rate_approved)
- NP-Quoten: Gleichverteilung als Standard, individuelle Anpassung moeglich
- Smart-Anpassung: Bei manueller Quotenaenderung werden andere NP
  automatisch proportional angepasst (Schloss-Icon fuer gesperrte NP)
- USt-Behandlung: Option B (USt auf Gesamtleistung, anteilig pro NP)
  -> Zur Abstimmung mit Katrin
- Dokumente: Rechnung Cubintec -> NP (PDF), PT-Nachweis Eigenanteile (PDF)

**Offene Punkte NWM-Modul (vor Implementierung klaeren):**
- Rechnungsnummernkreis: Format? (Vorschlag: R-JJJJ-NNN)
- Bankdaten Cubintec: Wo hinterlegen?
- USt-Behandlung: Abstimmung mit Katrin (Option B empfohlen)

**Geplante neue Dateien bei Implementierung:**
- migration_nwm_modul_v7_4_5.sql
- ZAPanel-v7_4_4-22.tsx
- ProjectDetailPage-v7_4_4-32.tsx
- NWMTab-v7_4_5-1.tsx
- NWMPartnerPanel-v7_4_5-1.tsx
- NWMEigenanteilPanel-v7_4_5-1.tsx
- NWMDokumente-v7_4_5-1.tsx

## Wichtige Erkenntnisse Session 8

### Print/PDF - korrekte Vorgehensweise
Problem war: handleExportPDF oeffnete Popup-Fenster -> Tailwind-CSS nicht geladen
Loesung: window.print() im gleichen Tab + DOM-Swap fuer selects
Nie wieder: Print-CSS veraendern wenn sie funktioniert

### git merge ohne vim
Ab sofort: git merge v7-dev --no-edit
Einmalige Konfiguration optional: git config --global merge.ff only

### ZIM-Richtlinie 2024 (analysiert)
- Netzwerkmanagement-Foerderung ist degressiv gestaffelt
- Foerderung gilt NUR fuer Managementkosten (nicht FuE-Einzelprojekte der NP)
- NP-Eigenbeteiligungen sind Pflichtnachweis fuer ZA-Auszahlung
- Cubintec ist selbst NWM -> Modul primaer fuer Cubintec-eigene Netzwerke

## Offene Punkte (naechste Session)

### Carry-over aus frueheren Sessions
- Firma-Detailseite Berater-Portal: Header gruen statt blau (Bug 5.9)
- ZA-Rollback-Button: Bewilligt -> Eingereicht
- Stundensatz-Diskrepanz Annika Arndt (20.19 vs. 20.35 EUR/h)
- ZA-Ampel Integration Berater-Dashboard

### Neu - NWM-Modul
- Abstimmung Katrin: USt-Behandlung Option B bestaetigen
- Rechnungsnummernkreis + Bankdaten klaeren
- Dann: SQL-Migration + Implementierung NWM-Tab

## Dateien in Downloads (Session 8)

| Dateiname | Ziel | Status |
|-----------|------|--------|
| TimesheetForm-v7_4_3-12.tsx | src/components/shared/TimesheetForm.tsx | deployed |
| KONZEPT-ZIM-NETZWERKMANAGEMENT-v1_2.md | Dokumentation | fertig |

## Pflichtenheft
**Version:** 4.48
**Datei:** PFLICHTENHEFT-v4_48.md
