# GIT-Sicherung Session 42 (Komplett)
**Datum:** 9. Mai 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v4.90
**Branch:** v7-dev

---

## Was wurde gemacht

### Konzeptionelle Entscheidungen
- **PZE V8-C** als Produktbezeichnung festgelegt (C = Cockpit)
- Code-Pfade bleiben intern `v7` — kein Refactoring
- Versionsanzeige dynamisch: V7 (ohne Cockpit) / V8-C (mit Cockpit, via usePathname)
- Architektur: Hybridmodell Service-Pages (ZA als Modal, andere via returnTo)
- Downloads-Verzeichnis vollstaendig aufgeraeumt und strukturiert

### Header (PortalHeader v7.3.95-10)
- Neues 3-Spalten-Layout: PZE-Block + Version | Firma + Portal | User + Rolle
- Volle Seitenbreite, print:hidden
- Alle Werte aus DB geladen (komplett entkoppelt von Props)
- Rollenhierarchie: system_admin immer Vorrang
- Rollenbezeichnungen DE: System Administrator, Berater, Projektkoordinator

### Footer (PortalFooter v7.4.9-1)
- Neuer permanenter Footer: fixed bottom, Portalfarbe, print:hidden
- Text: "PZE - Projektzeiterfassung by Cubintec GmbH, [Jahr] · Impressum · AGB & Datenschutz"
- Eingebunden in: FirmaCockpit, BerichtePage, LoginPage

### ZA-Workflow (grosses Feature)
- **useBerichteData v1.0.0**: Shared Data-Loading Hook fuer alle Berichte-Komponenten
- **ZASeite v1.0.7**: Standalone ZA-Seite ohne Dashboard-Overhead, volle Breite
- Neue Routen: `/v7/berater/foerderung/firma/[id]/za/` + `/v7/firma/za/`
- FirmaCockpit: ZA-Nummer klickbar -> direkt zu ZASeite
- FirmaCockpit: + (Neue ZA) -> ZASeite mit neuem ZA-Formular
- "Zurueck zum Cockpit" Button in ZASeite

### ZAPanel (v7.4.4-50)
- Status vollautomatisch abgeleitet (keine manuellen Buttons mehr):
  - Kein eingereicht_am -> Entwurf
  - eingereicht_am gesetzt -> Eingereicht
  - Zahlungseingang >= Foerderbetrag -> Volle Zahlung
  - Zahlungseingang < Foerderbetrag -> Gekuerzte Zahlung
- "Als eingereicht markieren" Button neben Datumsfeld
- Validierung: Zahlungsdatum erfordert Betrag > 0
- "Aktualisieren" -> "ZA speichern"
- hasChanges-Dialog (Abbrechen / Aenderungen verwerfen / ZA speichern)
- Zeilenreihenfolge: ZA Nr. | von | bis | Einreichdatum [Als eingereicht markieren]
- Archiv-Tab: volle Breite, neue Status-Legende

### Schriftgroessen
- Standard fuer alle Panel-Inhalte: text-xs->1rem, text-sm->1.125rem
- Via CSS style-tag mit !important auf Panel-IDs
- FirmaCockpit: cockpit-left, cockpit-right, cockpit-projekte, cockpit-prognose
- ZASeite: za-seite-content

---

## Geaenderte/Neue Dateien

| Datei | Version | Pfad |
|-------|---------|------|
| PortalHeader-v7_3_95-10.tsx | **7.3.95-10** | src/components/shared/PortalHeader.tsx |
| PortalFooter-v7_4_9-1.tsx | **7.4.9-1** | src/components/shared/PortalFooter.tsx |
| FirmaCockpit-v7_4_9-15.tsx | **7.4.9-15** | src/components/shared/FirmaCockpit.tsx |
| ZAPanel-v7_4_4-50.tsx | **7.4.4-50** | src/components/shared/ZAPanel.tsx |
| BerichtePage-v7_4_6-12.tsx | **7.4.6-12** | src/components/shared/BerichtePage.tsx |
| ZASeite-v1_0_7.tsx | **1.0.7** | src/components/shared/ZASeite.tsx |
| useBerichteData-v1_0_0.ts | **1.0.0** | src/hooks/useBerichteData.ts |
| login-page-v7_3_90-5.tsx | **7.3.90-5** | src/app/login/page.tsx |
| berater-za-page-v1_0_0.tsx | **1.0.0** | src/app/v7/berater/foerderung/firma/[id]/za/page.tsx |
| firma-za-page-v1_0_0.tsx | **1.0.0** | src/app/v7/firma/za/page.tsx |
| PFLICHTENHEFT-v4_90.md | 4.90 | PFLICHTENHEFT-v4_90.md |

---

## GIT-Befehle

```bash
cd ~/Documents/Dev/pze
git checkout v7-dev
git add -A
git commit -m "Session 42 komplett: PZE V8-C, PortalHeader/Footer, ZASeite, ZAPanel-Redesign

- PortalHeader v7.3.95-10: 3-Spalten, DB-basiert, V7/V8-C dynamisch
- PortalFooter v7.4.9-1: permanent fixed, Portalfarbe, print:hidden
- ZASeite + useBerichteData: standalone ZA ohne Dashboard-Overhead
- ZAPanel v7.4.4-50: Status auto-abgeleitet, Als eingereicht markieren,
  hasChanges-Dialog, ZA speichern, Archiv volle Breite
- FirmaCockpit v7.4.9-15: ZA-Nummern klickbar, groessere Schrift
- Downloads aufgeraeumt, Archiv-Struktur wiederhergestellt"

git push origin v7-dev
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
```

---

## Offene Punkte / Naechste Session

- Drucken aus Cockpit (Drucker-Icon je ZA) - Konzept noch offen
- Navigation-Zeile oben (PortalNav) besprechen
- Schritt 2: Action-Buttons Zielnavigation verfeinern
- Schritt 3: ProjektFortschrittPanel auf projektfortschritt-utils refactoren
- Stundennachweis + Projektfortschritt als eigenstaendige Seiten (wie ZASeite)
- BerichtePage auf useBerichteData umstellen (V7 Abwaertskompatibilitaet)
- Backlog: Arbeitszeitgrenzen Phase 3, Cockpit Feature-Toggles
